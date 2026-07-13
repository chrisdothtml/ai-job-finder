import { bodyParser } from '@koa/bodyparser';
import Koa from 'koa';
import { publicDir } from '../constants.ts';
import { getEnv } from '../utils/node.ts';
import { api } from './middleware/api.ts';

const server = new Koa();
const PORT = parseInt(getEnv('PORT', '8000'));
const HOST = getEnv('HOST', 'localhost');
const __DEV__ = getEnv('NODE_ENV') !== 'production';

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
if (__DEV__) {
  const { esbuild } = await import('./middleware/esbuild.ts');
  const { esbuildConfigs } = await import('../.scripts/esbuild.ts');

  server.use(await esbuild(publicDir, esbuildConfigs.appDev));
} else {
  const { default: serve } = await import('koa-static');
  server.use(serve(publicDir));
}

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
