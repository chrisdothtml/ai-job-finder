import { time } from '../utils/shared.ts';
import { LLM, type ChatMessage, type ChatResponse } from './_LLM.ts';

export class ChatGPT extends LLM {
  protected readonly providerName = 'ChatGPT';

  private baseUrl = 'https://api.openai.com/v1';
  private headers: Record<string, string>;

  constructor(
    apiKey: string,
    private signal: AbortSignal | null = null
  ) {
    super();
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  protected parseErrorBody(body: unknown) {
    const { error } = (body ?? {}) as {
      error?: { message?: string; type?: string; code?: string };
    };
    return { msg: error?.message, code: error?.code ?? error?.type };
  }

  async verifyConnection(model: string): Promise<void> {
    // fetching the model directly validates both the api key and the model id
    await this.request(`${this.baseUrl}/models/${encodeURIComponent(model)}`, {
      headers: this.headers,
    });
  }

  async listModels(): Promise<string[]> {
    const res = await this.request(
      `${this.baseUrl}/models`,
      { headers: this.headers },
      { cacheTTL: time.minute }
    );
    const { data } = (await res.json()) as { data: { id: string }[] };
    return data.map((m) => m.id).sort();
  }

  async chat(
    model: string,
    messages: ChatMessage[],
    format?: 'boolean' | 'json'
  ): Promise<ChatResponse> {
    const body: Record<string, unknown> = { model, messages };
    // reasoning models (o*/gpt-5*) reject any temperature but their default
    if (!/^(o\d|gpt-5)/.test(model)) {
      body.temperature = LLM.defaultParams.temperature;
    }
    if (format === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.request(`${this.baseUrl}/chat/completions`, {
      signal: this.signal,
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    this.signal?.throwIfAborted();

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const convoId = await this.storeConvo(messages, data);

    const message = data.choices[0].message.content;
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
