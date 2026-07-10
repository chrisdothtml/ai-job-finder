import { ENC_KEY_PREFIX, type Config } from '../analysis/types.ts';
import { tokenEncryptor } from '../server/utils.ts';
import { LLMError, type LLM } from './_LLM.ts';
import { ChatGPT } from './ChatGPT.ts';
import { Claude } from './Claude.ts';
import { Ollama } from './Ollama.ts';

// the ui only ever sends api keys encrypted (`enc:` prefix); decrypting here
// covers every entry point (verify-llm, resume summary, analysis start)
function resolveApiKey(apiKey: string): string {
  if (!apiKey.startsWith(ENC_KEY_PREFIX)) return apiKey;

  try {
    return tokenEncryptor.decryptString(apiKey.slice(ENC_KEY_PREFIX.length));
  } catch {
    throw new LLMError(
      'Invalid API key',
      'The stored key could not be decrypted; re-enter it in settings'
    );
  }
}

/** instantiate the LLM provider described by `config` */
export function resolveLLM(
  config: Config,
  signal: AbortSignal | null = null
): LLM {
  switch (config.modelProvider) {
    case 'claude': {
      return new Claude(resolveApiKey(config.apiKey!), signal);
    }
    case 'chatgpt': {
      return new ChatGPT(resolveApiKey(config.apiKey!), signal);
    }
    case 'ollama': {
      return new Ollama(config.baseUrl, signal);
    }
  }
}
