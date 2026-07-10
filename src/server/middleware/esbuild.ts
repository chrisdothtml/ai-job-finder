import { context as esbContext, type BuildOptions } from 'esbuild';
import { type Middleware } from 'koa';
import http from 'node:http';

/**
 * Koa middleware for running an esbuild dev server. The `servedir`
 * arg is the root of the "public" (or similar) dir where you're
 * serving your static assets from.
 *
 * Since this is a catch-all proxy to the esbuild server, it should
 * be considered a "terminal" middleware and installed at the end of
 * the middleware stack.
 */
export async function esbuild(
  servedir: string,
  opts: BuildOptions
): Promise<Middleware> {
  const esbCtx = await esbContext(opts);
  const { hosts, port: esbuildPort } = await esbCtx.serve({ servedir });

  return async (ctx) => {
    await new Promise<void>((resolve, reject) => {
      const proxyReq = http.request(
        {
          hostname: hosts[0],
          port: esbuildPort,
          path: ctx.url,
          method: ctx.method,
          headers: ctx.headers,
        },
        (proxyRes) => {
          ctx.status = proxyRes.statusCode ?? 200;
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) ctx.set(key, value as string | string[]);
          }
          ctx.body = proxyRes;
          resolve();
        }
      );
      proxyReq.on('error', reject);
      ctx.req.pipe(proxyReq, { end: true });
    });
  };
}
