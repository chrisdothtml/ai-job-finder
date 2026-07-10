import { time } from '../utils/shared.ts';
import { LLM, type ChatMessage, type ChatResponse } from './_LLM.ts';

export class Claude extends LLM {
  protected readonly providerName = 'Claude';

  // FIXME: make `maxTokens` a param of `chat` (need to update Ollama to include that in params; should make a standard `LLM` params interface that all the providers propagate)
  static defaultMaxTokens = 4096;

  private baseUrl = 'https://api.anthropic.com/v1';
  private headers: Record<string, string>;

  constructor(
    apiKey: string,
    private signal: AbortSignal | null = null
  ) {
    super();
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  protected parseErrorBody(body: unknown) {
    const { error } = (body ?? {}) as {
      error?: { type?: string; message?: string };
    };
    return { msg: error?.message, code: error?.type };
  }

  async verifyConnection(model: string): Promise<void> {
    // a minimal (1-token) message request validates both the api key and the
    // model id (which `/models` can't do, since it omits model aliases)
    await this.request(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
  }

  async listModels(): Promise<string[]> {
    const res = await this.request(
      `${this.baseUrl}/models`,
      { headers: this.headers },
      { cacheTTL: time.minute }
    );
    const { data } = (await res.json()) as { data: { id: string }[] };
    return data.map((m) => m.id);
  }

  async chat(
    model: string,
    messages: ChatMessage[],
    format?: 'boolean' | 'json'
  ): Promise<ChatResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: Claude.defaultMaxTokens,
      messages: nonSystemMessages,
    };
    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join('\n\n');
    }

    const response = await this.request(`${this.baseUrl}/messages`, {
      signal: this.signal,
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    this.signal?.throwIfAborted();

    const data = (await response.json()) as {
      content: { type: string; text: string }[];
    };
    const convoId = await this.storeConvo(messages, data);

    const message = data.content.find((b) => b.type === 'text')?.text ?? '';
    if (format === 'json') {
      try {
        return [JSON.parse(message.replace(/^```json|```$/g, '')), convoId];
      } catch (error) {
        // @ts-expect-error
        error.convoId = convoId;
        throw error;
      }
    } else if (format === 'boolean') {
      const trimmed = message.trim();
      if (trimmed === 'true' || trimmed === 'false') {
        return [trimmed === 'true', convoId];
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
