import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { cacheDir } from './constants.ts';

function serializeArgs(args: Parameters<Fetch>): string {
  const [url, init] = args;
  return JSON.stringify({
    url,
    init: init && {
      ...init,
      headers: init.headers
        ? Array.from(new Headers(init.headers).entries())
        : undefined,
    },
  });
}

interface CacheContext {
  cache?: boolean;
  cacheTTL?: number;
}

type Fetch = typeof fetch;
// FIXME: implement rate limit header/status-code detection
export async function cachedFetch(
  this: CacheContext | void,
  ...args: Parameters<Fetch>
): ReturnType<Fetch> {
  const { cache = true, cacheTTL } = this ?? {};
  if (!cache) return fetch(...args);

  await fs.mkdir(cacheDir, { recursive: true });

  const key = crypto
    .createHash('sha256')
    .update(serializeArgs(args))
    .digest('hex');
  const cacheFilePath = path.join(cacheDir, key + '.json');

  try {
    if (cacheTTL !== undefined) {
      const { mtimeMs } = await fs.stat(cacheFilePath);
      if (Date.now() - mtimeMs > cacheTTL) throw new Error('expired');
    }

    const cached = JSON.parse(await fs.readFile(cacheFilePath, 'utf8'));

    return new Response(Buffer.from(cached.body, 'base64'), {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  } catch {}

  const res = await fetch(...args);
  const buf = Buffer.from(await res.arrayBuffer());

  if (res.ok) {
    const payload = {
      status: res.status,
      statusText: res.statusText,
      headers: Array.from(res.headers.entries()),
      body: buf.toString('base64'),
    };

    await fs.writeFile(cacheFilePath, JSON.stringify(payload));
  }

  return new Response(buf, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
