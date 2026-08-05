---
name: create-scraper
description: Given a careers page URL, uses Playwright browser tools to explore the page, identify reliable scraping patterns (preferring hidden JSON APIs over DOM scraping), then writes a TypeScript Scraper subclass for that company
---

Your goal is to explore a company's careers page and write a permanent, reliable `Scraper` subclass that other code can use going forward. The argument is either:

1. the name of a company, e.g. `/create-scraper netflix`
2. a careers page URL, e.g. `/create-scraper https://explore.jobs.netflix.net/careers`, or
3. a json file containing a list of company names, e.g. `/create-scraper .data/companies.json` (in this case, you'll want to go through each company and determine if any existing scrapers work for it, or if a new one needs to be made)

## Step 1a - Identify the url for the careers page

If the careers page has been provided as the argument, move to the next step; otherwise search "[company-name] careers" via the `WebSearch` tool and navigate until you find the careers page.

## Step 1b — Identify the company name

Derive the class name and filename from the company's domain or brand name. E.g.:

- `explore.jobs.netflix.net` → `NetflixScraper` → `src/analysis/scraping/NetflixScraper.ts`
- `jobs.stripe.com` → `StripeScraper` → `src/analysis/scraping/StripeScraper.ts`

## Step 2 — Navigate and capture network traffic

The goal is to find a JSON API the page calls internally — these are far more reliable than DOM scraping.

1. Navigate to the URL with `browser_navigate`
2. Immediately inject a network monitor via `browser_evaluate`:

```js
window.__reqs = [];
const _f = window.fetch.bind(window);
window.fetch = function (input, init) {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  window.__reqs.push({ url, method: (init?.method || 'GET').toUpperCase() });
  return _f(input, init);
};
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url) {
  window.__reqs.push({ url: String(url), method: method.toUpperCase() });
  return _open.apply(this, arguments);
};
```

3. Take a `browser_snapshot` to understand the page structure
4. Interact with the page to trigger data loads: scroll to the bottom, wait a moment, then retrieve what was captured:

```js
window.__reqs;
```

5. Look for requests that look like job listing APIs — JSON endpoints with paths like `/api/jobs`, `/search`, `/v1/positions`, `/careers/api`, etc. Filter out analytics, fonts, images, and tracking pixels.

## Step 3 — Probe the API (if found)

If you found a promising API endpoint:

1. Use `browser_evaluate` to call it directly and inspect the response shape:

```js
const res = await fetch('ENDPOINT_URL');
const data = await res.json();
JSON.stringify(data, null, 2).slice(0, 3000); // preview
```

2. Understand the response structure: where are jobs listed? What fields are available (title, location, id, url)?
3. Identify pagination: look for `total`, `offset`, `limit`, `page`, `cursor`, or similar fields. Test by modifying query params.
4. Find the job detail endpoint: try appending a job ID to the base URL, or look for a detail URL in the job object.

**If the site uses Greenhouse or Lever**, stop — those are already handled by `GreenhouseScraper` and `LeverScraper`. Report this to the user instead of writing a new scraper.

## Step 4 — Explore pagination

Click through to page 2 (or trigger a "Load more"), confirm the data pattern holds, and understand the full pagination mechanism you'll need to implement.

## Step 5 — Inspect a job detail page

Navigate to 1–2 individual job listings:

1. Either call the detail API endpoint directly (if found)
2. Or click a job link and `browser_snapshot` the detail page

Understand what data is available: full description, requirements, salary, etc. This is what `getJobContent` will return.

## Step 6 — Write the Scraper

Now write `src/analysis/scraping/{Name}Scraper.ts`. The approach depends on what you found above.

### 6a — API-based scraper (preferred)

If you found a reliable JSON API:

```typescript
import { cachedFetch } from '../fetch.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

export class {Name}Scraper extends Scraper {
  async getJobsList(testing = false): Promise<ListedJob[]> {
    // Fetch all pages via the API and return the full list
    // if `testing` is true, only fetch a single job (if possible) to speed up tests
  }

  async getJobContent(id: string): Promise<string> {
    // Call the job detail API endpoint and return JSON.stringify(data)
  }
}
```

### 6b — DOM-based scraper (fallback)

If no usable API exists, scrape the DOM with Playwright. Ask the user to confirm before adding the dependency (`yarn add playwright`), then write the scraper using the selectors and patterns you identified while exploring.

Use the **accessibility snapshot** you took in Step 2 to identify the most stable selectors — prefer `aria-label`, `role`, and `data-*` attributes over class names, which tend to change. If a job row has a consistent structure in the snapshot (e.g. a link with a heading inside it), reflect that in your selectors.

```typescript
import { chromium } from 'playwright';
import { Scraper, type ListedJob } from './Scraper.ts';

export class {Name}Scraper extends Scraper {
  private async withPage<T>(fn: (page: import('playwright').Page) => Promise<T>): Promise<T> {
    const browser = await chromium.launch({ headless: true });
    try {
      return await fn(await browser.newPage());
    } finally {
      await browser.close();
    }
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    return this.withPage(async (page) => {
      // Navigate, handle pagination, and extract jobs from the DOM
      // Return ListedJob[] = { title: string; location: string; id: string }
      // Use the job detail page URL (or a stable path segment) as `id`
    });
  }

  async getJobContent(id: string): Promise<string> {
    return this.withPage(async (page) => {
      // Navigate to the job detail page using `id`
      // Extract and return the meaningful text content of the posting
    });
  }
}
```

Pagination in DOM scrapers: look for a "Next" button or "Load more" and loop until it's gone or disabled. Confirm the selector works by watching the snapshot change between pages during exploration.

### Shared conventions

- **Prefer `cachedFetch` over raw `fetch`** for any HTTP calls — it's a drop-in and caches responses to disk
- `id` in `ListedJob` must be stable and usable in `getJobContent` to retrieve details
- `getJobContent` should return a rich string — either `JSON.stringify(apiResponse)` or the full text of the job posting — since it's passed to the Analyzer to assess fit
- Handle pagination fully in `getJobsList` — return all jobs, not just page 1
- The `location` field can be a comma-joined string if multiple locations exist

## Step 7 — Register the company in `companies.ts`

Add the new company to the `companies` object in `src/analysis/companies.ts`, filling in **every** field of the `Company` interface. Use the `WebSearch` tool to research the company:

- `homepage`: resolve the company's official homepage URL via web search. It must start with `https://` and must **not** have a trailing slash (e.g. `https://www.stripe.com`, not `http://stripe.com/`)
- `summary`: a very brief description of the company (2 sentences max) — what it does/makes and anything notably distinctive, based on your web search results

## Step 8 — Verify

Run `yarn typecheck` to confirm the file compiles cleanly. Fix any type errors before reporting done.

Add the new company to `scrapers.test.ts` then run `TEST_COMPANIES=[COMPANY_SLUG] yarn test ./src/analysis/scraping/scrapers.test.ts`
