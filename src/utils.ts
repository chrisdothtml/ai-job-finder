import process from 'node:process';

export function getEnv(key: string, fallback?: string): string | null {
  if (process.env.hasOwnProperty(key)) {
    return process.env[key] as string;
  }

  return fallback ?? null;
}

export interface GeoLocation {
  status: 'success' | 'fail';
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

export async function getGeoLocation(): Promise<GeoLocation> {
  const response = await fetch('http://ip-api.com/json');
  if (!response.ok) {
    throw new Error(
      `GeoLocation request failed: ${response.status} ${response.statusText}`
    );
  }
  return response.json() as Promise<GeoLocation>;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaOptions {
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

// built-in recommended settings for models
export const modelPresets: { [model: string]: OllamaOptions } = {
  'gemma4:e4b': { temperature: 1.0, top_p: 0.95, top_k: 64 },
} as const;

export async function ollamaChat<T>(
  model: string,
  messages: OllamaMessage[],
  opts: OllamaOptions = {}
): Promise<T> {
  const host = getEnv('OLLAMA_HOST', 'http://localhost:11434');
  const presetOpts = modelPresets[model] ?? {};
  const response = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: 'json',
      options: { ...presetOpts, ...opts },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { message: { content: string } };
  try {
  return JSON.parse(data.message.content.replace(/^```json|```$/g, '')) as T;
  } catch (error) {
    // @ts-expect-error
    error.chatMessage = data.message;
    throw error;
  }
}

/**
 * Dedent a multiline string based on the indentation of the first non-empty line.
 */
export function dedent(str: string): string {
  const lines = str.replace(/^(?:\r?\n)*|(?:\r?\n)*\s*$/g, '').split(/\r?\n/);

  // determine the indent level
  let indentLevel = null;
  for (const line of lines) {
    if (line.trim() !== '') {
      const match = line.match(/^(\s*)/);
      indentLevel = match ? match[1] : '';
      break;
    }
  }
  if (indentLevel === null || indentLevel === '') {
    return str;
  }
  const indentLength = indentLevel.length;

  // dedent each line based on the indentation level
  return lines
    .map((line) => {
      const lineMatch = line.match(/^(\s*)/);
      const lineIndent = lineMatch ? lineMatch[1] : '';
      const removeLength = Math.min(indentLength, lineIndent.length);
      return line.substring(removeLength);
    })
    .join('\n');
}

export interface SpinnerOptions {
  clearAfter?: boolean;
}

export class Spinner {
  static frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  static ansi = {
    blue: '\x1b[34m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
  };

  private i = 0;
  private timer?: NodeJS.Timeout;

  constructor(
    public text: string,
    private opts: SpinnerOptions = {}
  ) {}

  start() {
    if (this.timer) return this;

    const { ansi, frames } = Spinner;
    this.timer = setInterval(() => {
      const frame = frames[(this.i = (this.i + 1) % frames.length)];
      this.render(`${ansi.blue}${frame} ${this.text}${ansi.reset}`);
    }, 80);

    return this;
  }

  succeed(finalText?: string) {
    const { ansi } = Spinner;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (this.opts.clearAfter) {
      this.prevRenderWidth = 0;
      process.stdout.write('\r\x1b[K');
      return;
    }

    this.render(`${ansi.green}✔${ansi.reset} ${finalText ?? this.text}`);
    process.stdout.write('\n');
  }

  private prevRenderWidth = 0;
  private render(text: string) {
    const renderWidth = text.length;
    const paddingAmt = Math.max(this.prevRenderWidth - renderWidth, 0);

    this.prevRenderWidth = renderWidth;
    process.stdout.write(`\r${text}${' '.repeat(paddingAmt)}`);
  }
}
