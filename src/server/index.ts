import { bodyParser } from '@koa/bodyparser';
import Koa from 'koa';
import path from 'node:path';
import { publicDir, repoRootDir } from '../constants.ts';
import { getEnv } from '../utils/node.ts';
import { api } from './middleware/api.ts';

const server = new Koa();
const PORT = parseInt(getEnv('PORT', '8000'));
const DEV = getEnv('NODE_ENV') !== 'production';

// an SSE client disconnecting mid-stream (page reload/close while subscribed
// to /api/analysis/events) surfaces as a premature close on the response
// pipe; that's routine, not a failure, so keep it out of the error log
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
  console.error(error);
});

// jsonLimit needs headroom for base64-encoded resume uploads (/api/parse-resume)
server.use(bodyParser({ enableTypes: ['json'], jsonLimit: '15mb' }));
server.use(api.routes()).use(api.allowedMethods());

// use esbuild dev server during development, otherwise just statically
// serve the public dir (assumes a ui build is ran first)
if (DEV) {
  const { esbuild } = await import('./middleware/esbuild.ts');

  server.use(
    await esbuild(publicDir, {
      entryPoints: [path.join(repoRootDir, 'src/ui/index.tsx')],
      bundle: true,
      outdir: path.join(publicDir, 'bundles'),
      external: ['node:*'],
      format: 'esm',
      sourcemap: 'inline',
      define: { DEV: 'true' },
    })
  );
} else {
  const { default: serve } = await import('koa-static');
  server.use(serve(publicDir));
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
