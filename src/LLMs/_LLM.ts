import { randomUUID } from 'crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { convosDir } from '../constants.ts';
import { cachedFetch } from '../utils/fetch.ts';

/**
 * Standardized error thrown by all LLM providers; shaped so it can be
 * surfaced directly in the ui (see `LLMBtnFailure`)
 */
export class LLMError extends Error {
  constructor(
    public title: string,
    public msg: string,
    public code?: string
  ) {
    super(msg);
    this.name = 'LLMError';
  }

  toJSON() {
    return { title: this.title, msg: this.msg, code: this.code };
  }
}

/** coerce any thrown value into an {@linkcode LLMError} */
export function toLLMError(error: unknown): LLMError {
  if (error instanceof LLMError) return error;
  const msg = error instanceof Error ? error.message : String(error);
  return new LLMError('Unexpected error', msg);
}

function statusTitle(status: number): string {
  if (status === 401) return 'Auth failed';
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Not found';
  if (status === 429) return 'Rate limited';
  if (status >= 500) return 'Server error';
  return 'Request failed';
}

export abstract class LLM {
  static async clearConvos() {
    await fs.rm(convosDir, { force: true, recursive: true });
  }

  /** display name used in error messages */
  protected abstract readonly providerName: string;

  /** verifies the connection/credentials and that `model` is usable; throws {@linkcode LLMError} */
  abstract verifyConnection(model: string): Promise<void>;
  abstract listModels(): Promise<string[]>;
  abstract chat(
    model: string,
    messages: ChatMessage[],
    format?: 'boolean' | 'json'
  ): Promise<ChatResponse>;

  /** extract a human-readable message (and optional error code) from the provider's error response body */
  protected abstract parseErrorBody(body: unknown): {
    msg?: string;
    code?: string;
  };

  /**
   * `fetch` wrapper that converts network failures and error responses into
   * {@linkcode LLMError}s (including provider error details when available)
   */
  protected async request(
    url: string,
    init: RequestInit = {},
    { cacheTTL }: { cacheTTL?: number } = {}
  ): Promise<Response> {
    let res: Response;
    try {
      res =
        cacheTTL !== undefined
          ? await cachedFetch.call({ cacheTTL }, url, init)
          : await fetch(url, init);
    } catch (e) {
      const error = e as Error & { cause?: { code?: string } };
      // aborts aren't connection errors; let callers handle them
      if (error.name === 'AbortError') throw error;

      let host = url;
      try {
        host = new URL(url).origin;
      } catch {}
      throw new LLMError(
        'Connection failed',
        `Couldn't reach ${this.providerName} (${host})`,
        error.cause?.code ?? error.message
      );
    }

    if (!res.ok) {
      let parsed: { msg?: string; code?: string } = {};
      try {
        parsed = this.parseErrorBody(await res.json());
      } catch {}

      throw new LLMError(
        statusTitle(res.status),
        parsed.msg ??
          `${this.providerName} responded with "${res.status} ${res.statusText}"`,
        ['HTTP ' + res.status, parsed.code].filter(Boolean).join(' · ')
      );
    }

    return res;
  }

  protected async storeConvo(messages: ChatMessage[], response: any) {
    const convoId = Date.now() + '-' + randomUUID().split('-')[0];

    await fs.writeFile(
      path.join(convosDir, `${convoId}.json`),
      JSON.stringify({ convoId, messages, response }, null, 2)
    );

    return convoId;
  }
}

export type ChatResponse = [response: any, convoId: string];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
