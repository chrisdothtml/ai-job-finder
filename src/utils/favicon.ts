import { type Company } from '../analysis/companies.ts';
import { cachedFetch } from './fetch.ts';
import { time } from './shared.ts';

const FAVICON_CACHE_TTL = 14 * time.day;

export interface FaviconResult {
  ok: boolean;
  contentType: string | null;
  body: Buffer;
}

// dedupes concurrent fetches for the same domain, since a page of job
// cards can request the same company's favicon many times at once
const inflightFavicons = new Map<string, Promise<FaviconResult>>();

// fetches a company's favicon from google's favicon service, cached on disk;
// used by the server's /api/company-favicon proxy and by the docs build,
// which bakes the icons into the static site
export function fetchCompanyFavicon(company: Company): Promise<FaviconResult> {
  const domain = new URL(company.homepage).hostname;
  let inflight = inflightFavicons.get(domain);
  if (!inflight) {
    inflight = (async () => {
      const res = await cachedFetch.call(
        { cacheTTL: FAVICON_CACHE_TTL },
        `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      );
      return {
        ok: res.ok,
        contentType: res.headers.get('content-type'),
        body: Buffer.from(await res.arrayBuffer()),
      };
    })().finally(() => inflightFavicons.delete(domain));
    inflightFavicons.set(domain, inflight);
  }
  return inflight;
}
