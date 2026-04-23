import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { cacheDir } from './constants.ts';
import path from 'node:path';

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

type Fetch = typeof fetch;
export async function cachedFetch(
  ...args: Parameters<Fetch>
): ReturnType<Fetch> {
  await fs.mkdir(cacheDir, { recursive: true });

  const key = crypto
    .createHash('sha256')
    .update(serializeArgs(args))
    .digest('hex');
  const cacheFilePath = path.join(cacheDir, key + '.json');

  try {
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
