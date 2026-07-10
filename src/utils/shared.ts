/** Readable time durations in milliseconds */
export const time = (() => {
  const second = 1e3;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  return { second, minute, hour, day } as const;
})();

export function buildUrl(
  base: string,
  path: string,
  params: Record<string, string | number | boolean>
): URL {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url;
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
