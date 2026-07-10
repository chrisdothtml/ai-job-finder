import { type LLMBtnFailure } from './Settings/LLMBtn.tsx';

export type ApiResult<T = {}> =
  | ({ ok: true } & T)
  | { ok: false; failure: LLMBtnFailure };

/**
 * POSTs a json body to a local api endpoint; never throws — request
 * failures are returned as an `{ ok: false, failure }` result so they can
 * be surfaced in the ui directly
 */
export async function postApi<T = {}>(
  path: string,
  body: unknown
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return {
      ok: false,
      failure: {
        title: 'Request failed',
        msg: "Couldn't reach the local server; is it still running?",
        code: (error as Error).message,
      },
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      failure: {
        title: 'Request failed',
        msg: 'The local server responded with an error',
        code: `HTTP ${res.status}`,
      },
    };
  }

  return (await res.json()) as ApiResult<T>;
}
