/*
 * This module was forked from https://github.com/macsplit/urltomarkdown
 * and refactored to be a simple interface for converting job posting
 * pages to markdown documents.
 */

import { Readability } from '@mozilla/readability';
import { decode as decodeHtmlEntities } from 'html-entities';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

export interface UrlToMarkdownOptions {
  inlineTitle?: boolean;
  ignoreLinks?: boolean;
  improveReadability?: boolean;
}

export interface UrlToMarkdownResult {
  markdown: string;
  title: string | null;
}

interface Options {
  inlineTitle: boolean;
  ignoreLinks: boolean;
  improveReadability: boolean;
}

interface Replacement {
  placeholder: string;
  replacement: string;
}

// ── Table converter ───────────────────────────────────────────────────────────

const TABLE_MAX_WIDTH = 96;

function cleanTableCell(str: string): string {
  return decodeHtmlEntities(
    str.replace(/<\/?[^>]+(>|$)/g, '').replace(/(\r\n|\n|\r)/gm, '')
  );
}

function convertTableToMarkdown(table: string): string {
  let result = '\n';

  const caption = table.match(/<caption[^>]*>((?:.|\n)*)<\/caption>/i);
  if (caption) result += cleanTableCell(caption[1]) + '\n\n';

  const rows = table.match(/(<tr[^>]*>(?:.|\n)*?<\/tr>)/gi);
  const nRows = rows?.length ?? 0;
  if (nRows < 2) return '';

  const items: string[][] = rows!.map((row) =>
    (row.match(/<t[hd][^>]*>(?:.|\n)*?<\/t[hd]>/gi) ?? []).map(cleanTableCell)
  );

  let nCols = 0;
  for (const row of items) nCols = Math.max(nCols, row.length);
  for (const row of items) while (row.length < nCols) row.push('');

  const colWidths = Array<number>(nCols).fill(3);
  for (const row of items) {
    for (let c = 0; c < nCols; c++)
      colWidths[c] = Math.max(colWidths[c], row[c].length);
  }

  if (colWidths.reduce((a, b) => a + b, 0) < TABLE_MAX_WIDTH) {
    result +=
      '|' +
      items[0].map((cell, c) => cell.padEnd(colWidths[c])).join('|') +
      '|\n';
    result += '|' + colWidths.map((w) => '-'.repeat(w)).join('|') + '|\n';
    for (let r = 1; r < nRows; r++) {
      result +=
        '|' +
        items[r].map((cell, c) => cell.padEnd(colWidths[c])).join('|') +
        '|\n';
    }
  } else {
    result += '\n';
    for (let r = 1; r < nRows; r++) {
      if (items[0][0] || items[r][0]) result += '* ';
      if (items[0][0]) result += items[0][0] + ': ';
      if (items[r][0]) result += items[r][0];
      if (items[0][0] || items[r][0]) result += '\n';
      for (let c = 1; c < nCols; c++) {
        if (items[0][c] || items[r][c]) result += '  * ';
        if (items[0][c]) result += items[0][c] + ': ';
        if (items[r][c]) result += items[r][c];
        if (items[0][c] || items[r][c]) result += '\n';
      }
    }
  }

  return result;
}

// ── HTML pre-processing ───────────────────────────────────────────────────────

function stripStyleAndScript(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
}

function formatCodeBlocks(html: string, replacements: Replacement[]): string {
  const codeblocks = html.match(/(<pre[^>]*>(?:.|\n)*?<\/pre>)/gi);
  if (!codeblocks) return html;
  for (let c = 0; c < codeblocks.length; c++) {
    const filtered = decodeHtmlEntities(
      codeblocks[c]
        .replace(/<br[^>]*>/g, '\n')
        .replace(/<p>/g, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
    );
    const placeholder = `urltomarkdowncodeblockplaceholder${c}${Math.random()}`;
    replacements.push({
      placeholder,
      replacement: '```\n' + filtered + '\n```\n',
    });
    html = html.replace(codeblocks[c], '<p>' + placeholder + '</p>');
  }
  return html;
}

function formatTables(html: string, replacements: Replacement[]): string {
  const tables = html.match(/(<table[^>]*>(?:.|\n)*?<\/table>)/gi);
  if (!tables) return html;
  for (let t = 0; t < tables.length; t++) {
    const placeholder = `urltomarkdowntableplaceholder${t}${Math.random()}`;
    replacements.push({
      placeholder,
      replacement: convertTableToMarkdown(tables[t]),
    });
    html = html.replace(tables[t], '<p>' + placeholder + '</p>');
  }
  return html;
}

// ── Domain filters ────────────────────────────────────────────────────────────

interface DomainFilter {
  domain: RegExp;
  remove?: RegExp[];
  replace?: { find: RegExp | string; replacement: string }[];
}

const DOMAIN_FILTERS: DomainFilter[] = [
  {
    domain: /.*/,
    remove: [/\[¶\]\(#[^\s]+\s+"[^"]+"\)/g],
    replace: [
      {
        find: /\[[\n\s]*([^\]\n]*)[\n\s]*\]\(([^\)]*)\)/g,
        replacement: '[$1]($2)',
      },
      { find: /\)\[/g, replacement: ')\n[' },
      {
        find: /\[([^\]]*)\]\(\/\/([^\)]*)\)/g,
        replacement: '[$1](https://$2)',
      },
    ],
  },
];

function applyFilters(url: string, data: string, ignoreLinks: boolean): string {
  const parsed = new URL(url);
  const baseAddress = parsed.protocol + '//' + parsed.hostname;
  const domain = parsed.hostname;

  for (const filter of DOMAIN_FILTERS) {
    if (!domain.match(filter.domain)) continue;
    for (const pattern of filter.remove ?? []) data = data.replace(pattern, '');
    for (const { find, replacement } of filter.replace ?? []) {
      if (find instanceof RegExp)
        data = data.replace(find, replacement as string);
      else data = data.replaceAll(find, replacement as string);
    }
  }

  data = data.replaceAll(
    /\[([^\]]*)\]\(\/([^/][^\)]*)\)/g,
    (_match, title: string, address: string) =>
      `[${title}](${baseAddress}/${address})`
  );

  if (ignoreLinks) {
    data = data.replaceAll(/\[\[?([^\]]+\]?)\]\([^\)]+\)/g, '$1');
    data = data.replaceAll(/[\\\[]+([0-9]+)[\\\]]+/g, '[$1]');
  }

  return data;
}

// ── Core processor ────────────────────────────────────────────────────────────

const turndown = new TurndownService();

function processDom(
  url: string | null,
  dom: JSDOM,
  options: Options
): UrlToMarkdownResult {
  const titleEl = dom.window.document.querySelector('title');
  const title = titleEl?.textContent ?? null;

  let readable: string | null = null;
  if (options.improveReadability) {
    const parsed = new Readability(
      dom.window.document as unknown as Document
    ).parse();
    if (parsed) readable = parsed.content;
  }
  if (!readable) readable = dom.window.document.documentElement.outerHTML;

  const replacements: Replacement[] = [];
  readable = formatCodeBlocks(readable, replacements);
  readable = formatTables(readable, replacements);

  let markdown = turndown.turndown(readable);
  for (const { placeholder, replacement } of replacements) {
    markdown = markdown.replace(placeholder, replacement);
  }

  let result = url
    ? applyFilters(url, markdown, options.ignoreLinks)
    : markdown;
  if (options.inlineTitle && title) result = '# ' + title + '\n' + result;

  return { markdown: result, title };
}

// ── Fetching ──────────────────────────────────────────────────────────────────

async function fetchUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Urltomarkdown/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function urlToMarkdown(
  url: string,
  options: UrlToMarkdownOptions = {}
): Promise<UrlToMarkdownResult> {
  const opts: Options = {
    inlineTitle: options.inlineTitle ?? false,
    ignoreLinks: options.ignoreLinks ?? false,
    improveReadability: options.improveReadability ?? true,
  };
  const html = stripStyleAndScript(await fetchUrl(url));
  return processDom(url, new JSDOM(html), opts);
}
