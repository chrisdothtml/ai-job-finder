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
    throw new Error(`GeoLocation request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<GeoLocation>;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function ollamaChat<T>(
  model: string,
  messages: OllamaMessage[],
  baseUrl = getEnv('OLLAMA_HOST') || 'http://localhost:11434'
): Promise<T> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { message: { content: string } };
  return JSON.parse(data.message.content) as T;
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
