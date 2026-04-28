import { test } from 'node:test';
import { companies } from '../.generated/company-listings.ts';
import { getEnv } from '../utils.ts';

type CompanySlug = keyof typeof companies;
// hand-selected list to ensure all types of scrapers are covered
const TEST_COMPANIES: CompanySlug[] = [
  'airbnb',
  'applovin',
  'block',
  'github',
  'netflix',
  'shopify',
  'snowflake',
  'spotify',
];

test('Ensure Scrapers work', async (t) => {
  const testCompanies = getCompaniesFromEnv() ?? TEST_COMPANIES;
  for (const slug of testCompanies) {
    const { Scraper } = companies[slug];

    t.test(`${Scraper.name} (${slug})`, async (t) => {
      using scraper = new Scraper(slug);
      await scraper._test(t);
    });
  }
});

function getCompaniesFromEnv(): CompanySlug[] | null {
  const env = getEnv('TEST_COMPANIES');
  if (env && env.length > 0) {
    const slugs = env.split(/, ?/);
    for (const slug of slugs) {
      if (!companies.hasOwnProperty(slug)) {
        throw new Error(
          `Companies provided via 'TEST_COMPANIES' env var must exist in 'company-listings.ts'`
        );
      }
    }

    return slugs;
  }

  return null;
}
