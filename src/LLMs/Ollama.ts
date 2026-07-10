import { time } from '../utils/shared.ts';
import { LLM, LLMError, type ChatMessage, type ChatResponse } from './_LLM.ts';

export interface OllamaParams {
  // Sampling
  temperature?: number; // randomness (0 = deterministic)
  top_k?: number; // limit vocab to top K tokens
  top_p?: number; // nucleus sampling
  min_p?: number; // minimum probability cutoff
  typical_p?: number; // typical sampling
  repeat_penalty?: number;
  repeat_last_n?: number;
  presence_penalty?: number;
  frequency_penalty?: number;

  // Generation limits
  num_predict?: number; // max tokens to generate
  stop?: string[]; // stop sequences

  // Performance / threading
  num_ctx?: number; // context window size
  num_batch?: number;
  num_thread?: number;

  // GPU / hardware
  num_gpu?: number;
  main_gpu?: number;
  low_vram?: boolean;
  f16_kv?: boolean;
  logits_all?: boolean;
  vocab_only?: boolean;
  use_mmap?: boolean;
  use_mlock?: boolean;

  // Misc
  seed?: number; // deterministic runs
  mirostat?: number; // 0=off, 1=mirostat, 2=mirostat v2
  mirostat_tau?: number;
  mirostat_eta?: number;
  penalize_newline?: boolean;

  // Advanced / model-specific
  grammar?: string; // BNF grammar constraint
}

export interface OllamaChatOptions {
  model: string;
  messages: ChatMessage[];
  format?: 'boolean' | 'json';
  stream?: boolean;
  options?: OllamaParams;
}

export class Ollama extends LLM {
  protected readonly providerName = 'Ollama';

  static defaultHost = 'http://localhost:11434';
  /** built-in recommended settings for models */
  static modelPresets: { [model: string]: OllamaParams } = {
    base: { temperature: 0.1, num_ctx: 2e4 },
    'gemma4:e4b': { top_p: 0.95, top_k: 64 },
  } as const;

  constructor(
    private host: string = Ollama.defaultHost,
    private signal: AbortSignal | null = null
  ) {
    super();
  }

  protected parseErrorBody(body: unknown) {
    const { error } = (body ?? {}) as { error?: string };
    return { msg: typeof error === 'string' ? error : undefined };
  }

  async verifyConnection(model: string): Promise<void> {
    const res = await this.request(`${this.host}/api/version`);
    const { version } = (await res.json().catch(() => ({}))) as {
      version?: string;
    };
    if (typeof version !== 'string') {
      throw new LLMError(
        'Unexpected response',
        `The server at ${this.host} doesn't appear to be an Ollama server`
      );
    }

    // ollama treats a tag-less model name as `<model>:latest`
    const models = await this.listModels();
    if (!models.some((m) => m === model || m === `${model}:latest`)) {
      throw new LLMError(
        'Model not available',
        `"${model}" isn't downloaded on the Ollama server; run \`ollama pull ${model}\` first`
      );
    }
  }

  async listModels(): Promise<string[]> {
    const res = await this.request(`${this.host}/api/tags`);
    const { models } = (await res.json()) as { models: { name: string }[] };
    return models.map((m) => m.name);
  }

  async loadModel(model: string, ttl = 5 * time.minute) {
    await this.request(`${this.host}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model,
        keep_alive: Math.round(ttl / time.second) + 's',
      }),
    }).catch(() => {});
  }

  async unloadModel(model: string) {
    await this.request(`${this.host}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({ model, keep_alive: 0 }),
    }).catch(() => {});
  }

  async chat(
    model: string,
    messages: ChatMessage[],
    format?: 'boolean' | 'json'
  ): Promise<ChatResponse> {
    const presetParams = Ollama.modelPresets[model] ?? {};
    const body: OllamaChatOptions = {
      stream: false,
      model,
      messages,
      options: { ...Ollama.modelPresets.base, ...presetParams },
    };
    if (format) {
      body.format = format;
    }

    const response = await this.request(`${this.host}/api/chat`, {
      signal: this.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    this.signal?.throwIfAborted();

    const data = (await response.json()) as { message: { content: string } };
    const convoId = await this.storeConvo(messages, data);

    const message = data.message.content;
    if (format === 'json') {
      try {
        return [JSON.parse(message.replace(/^```json|```$/g, '')), convoId];
      } catch (error) {
        // @ts-expect-error
        error.convoId = convoId;
        throw error;
      }
    } else if (format === 'boolean') {
      if (message === 'true' || message === 'false') {
        return [message === 'true', convoId];
      } else {
        const error = new Error(`Model didn't respond with a boolean`);
        // @ts-expect-error
        error.convoId = convoId;
        throw error;
      }
    } else {
      return [message, convoId];
    }
  }
}
