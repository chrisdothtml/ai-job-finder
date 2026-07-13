/**
 * Captures the docs page's app preview (rendered in `?screenshot` mode
 * by the docs dev server) as a transparent-background banner image for
 * the repo readme.
 *
 * Usage: yarn screenshot-app [out-path]
 */
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import { repoRootDir } from '../constants.ts';
import { build } from './esbuild.ts';

const DEFAULT_OUT_PATH = path.join(repoRootDir, '.github/assets/banner.png');
const IMAGE_SCALE = 2;

const outPath = path.resolve(process.argv[2] ?? DEFAULT_OUT_PATH);
const { port } = (await build('docsDev'))!;

// `playwright-core` doesn't bundle browsers; use the installed chrome
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: IMAGE_SCALE,
});
await page.goto(`http://localhost:${port}/?screenshot`);

// after react renders, fonts/favicons can still be settling; wait them
// out so the capture isn't missing glyphs or icons
const frameWrap = page.locator('.docs-frame-wrap');
await frameWrap.waitFor();
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((img) => img.decode().catch(() => {}))
  );
});

// the wrap's screenshot-mode padding covers the frame's drop shadow, so
// its box is exactly the area worth keeping; `omitBackground` leaves
// unpainted pixels transparent
await frameWrap.screenshot({ path: outPath, omitBackground: true });
console.error(`Saved banner to ${path.relative(repoRootDir, outPath)}`);

await browser.close();
// the docs dev server's watcher keeps the process alive; exit explicitly
process.exit(0);
