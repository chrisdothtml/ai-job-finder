import Router from '@koa/router';
import pdf2md from '@opendocsg/pdf2md';
import fs from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { Analyzer } from '../../analysis/Analyzer.ts';
import { companies } from '../../analysis/companies.ts';
import {
  manager,
  ManagerEvent,
  managerEvents,
  type ManagerEventMap,
} from '../../analysis/manager.ts';
import {
  isValidAnalyzerSettings,
  isValidConfig,
  isValidUserInfo,
  type AnalyzerSettings,
  type PartialConfig,
  type PartialUserInfo,
} from '../../analysis/types.ts';
import { jobsFile } from '../../constants.ts';
import { toLLMError } from '../../LLMs/_LLM.ts';
import { Ollama } from '../../LLMs/Ollama.ts';
import { resolveLLM } from '../../LLMs/resolveLLM.ts';
import { fetchCompanyFavicon } from '../../utils/favicon.ts';
import { pathExists } from '../../utils/node.ts';
import { tokenEncryptor } from '../utils.ts';

export const api = new Router();

api.get('/ping', (ctx) => {
  ctx.body = 'pong';
});

// encrypts a sensitive value (i.e. an api key) so the ui never has to
// store/send it in plaintext; responds with `{ ok: true, output: string }`
api.post('/api/encrypt-string', async (ctx) => {
  const { input } = ctx.request.body as { input?: string };
  if (typeof input !== 'string' || !input) {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  ctx.body = { ok: true, output: tokenEncryptor.encryptString(input) };
});

// extracts the text content (as markdown) from an uploaded resume pdf (sent as base64)
api.post('/api/parse-resume', async (ctx) => {
  const { fileName, base64 } = ctx.request.body as {
    fileName: string;
    base64: string;
  };
  if (
    typeof fileName !== 'string' ||
    typeof base64 !== 'string' ||
    !fileName.toLowerCase().endsWith('.pdf')
  ) {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  const text = await pdf2md(Buffer.from(base64, 'base64'));
  ctx.body = { text };
});

api.get('/api/companies', async (ctx) => {
  ctx.body = companies;
});

// proxies the company's favicon from google's favicon service, so the
// browser never hits google directly and responses are cached on disk
api.get('/api/company-favicon/:slug', async (ctx) => {
  const company = companies[ctx.params.slug];
  if (!company) {
    ctx.body = '404: Not Found';
    ctx.status = 404;
    return;
  }

  const icon = await fetchCompanyFavicon(company);
  if (!icon.ok) {
    ctx.body = '404: Not Found';
    ctx.status = 404;
    return;
  }

  ctx.set('Cache-Control', 'public, max-age=86400');
  ctx.type = icon.contentType ?? 'image/png';
  ctx.body = icon.body;
});

api.get('/api/jobs', async (ctx) => {
  if (await pathExists(jobsFile)) {
    ctx.body = JSON.parse(await fs.readFile(jobsFile, 'utf-8'));
  } else {
    ctx.body = [];
  }
});

// deletes the analyzed-jobs file (an in-progress run would immediately
// rewrite it, so the ui only offers this while no run is active)
api.post('/api/jobs/clear', async (ctx) => {
  await fs.rm(jobsFile, { force: true });
  ctx.body = { ok: true };
});

// verifies that the provider in `config` is reachable, the credentials are
// valid, and the chosen model is usable; always responds 200 with
// `{ ok: true } | { ok: false, failure: LLMError }`
api.post('/api/verify-llm', async (ctx) => {
  const config = ctx.request.body as PartialConfig;
  if (!isValidConfig(config)) {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  try {
    await resolveLLM(config).verifyConnection(config.model);
    ctx.body = { ok: true };
  } catch (error) {
    ctx.body = { ok: false, failure: toLLMError(error) };
  }
});

// generates the resume summary from the user info; responds 200 with
// `{ ok: true, summary: string } | { ok: false, failure: LLMError }`
api.post('/api/generate-resume-summary', async (ctx) => {
  const { config, userInfo } = ctx.request.body as {
    config?: PartialConfig;
    userInfo?: PartialUserInfo;
  };
  if (!isValidConfig(config) || !isValidUserInfo(userInfo)) {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  const analyzer = new Analyzer(
    { config, userInfo, companiesList: [] },
    new AbortController().signal
  );
  try {
    const summary = await analyzer.generateResumeSummary();
    ctx.body = { ok: true, summary };
  } catch (error) {
    ctx.body = { ok: false, failure: toLLMError(error) };
  }
});

api.post('/api/ollama/load-model', async (ctx) => {
  const { host, model } = ctx.request.body as { host: string; model: string };
  if (typeof host !== 'string' || typeof model !== 'string') {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  const ollama = new Ollama(host);
  await ollama.loadModel(model);
  ctx.status = 200;
  ctx.body = null;
});

api.post('/api/ollama/unload-model', async (ctx) => {
  const { host, model } = ctx.request.body as { host: string; model: string };
  if (typeof host !== 'string' || typeof model !== 'string') {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  const ollama = new Ollama(host);
  await ollama.unloadModel(model);
  ctx.status = 200;
  ctx.body = null;
});

/*
 * Analysis endpoints
 */

api.get('/api/analysis/state', async (ctx) => {
  ctx.body = manager.state;
});

api.post('/api/analysis/start', async (ctx) => {
  const { settings } = ctx.request.body as { settings: AnalyzerSettings };
  if (!isValidAnalyzerSettings(settings)) {
    ctx.body = '400: Bad Request';
    ctx.status = 400;
    return;
  }

  manager.startAnalysis(settings);
  ctx.body = { ok: true };
});

api.post('/api/analysis/abort', async (ctx) => {
  manager.abortAnalysis();
  ctx.body = { ok: true };
});

// streams every analysis state change as an SSE event, starting with the
// current state; stays open for the lifetime of the client (`EventSource`
// auto-reconnects, so closing on idle would just cause a reconnect loop)
api.get('/api/analysis/events', async (ctx) => {
  // Set SSE headers
  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  ctx.status = 200;

  // Koa needs a PassThrough stream to keep the response open
  const stream = new PassThrough();
  ctx.body = stream;

  function onEvent(state: ManagerEventMap[ManagerEvent.State]) {
    stream.write(`data: ${JSON.stringify(state)}\n\n`);
  }

  onEvent(manager.state);
  managerEvents.on(ManagerEvent.State, onEvent);

  // Clean up when client disconnects
  ctx.req.on('close', () => {
    managerEvents.off(ManagerEvent.State, onEvent);
  });
});
