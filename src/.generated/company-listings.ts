import { AshbyScraper } from '../scraping/AshbyScraper.ts';
import { GreenhouseScraper } from '../scraping/GreenhouseScraper.ts';
import { LeverScraper } from '../scraping/LeverScraper.ts';
import { type ScraperSubclass } from '../scraping/Scraper.ts';

interface TechCompany {
  name: string;
  Scraper: ScraperSubclass;
  slug: string;
}

export const companies: TechCompany[] = [
  { name: 'Airbnb', slug: 'airbnb', Scraper: GreenhouseScraper },
  { name: 'AppLovin', slug: 'applovin', Scraper: GreenhouseScraper },
  { name: 'Astera Labs', slug: 'asteralabs', Scraper: GreenhouseScraper },
  { name: 'Block', slug: 'block', Scraper: GreenhouseScraper },
  { name: 'Cloudflare', slug: 'cloudflare', Scraper: GreenhouseScraper },
  { name: 'Coinbase', slug: 'coinbase', Scraper: GreenhouseScraper },
  { name: 'CoreWeave', slug: 'coreweave', Scraper: GreenhouseScraper },
  { name: 'Coupang', slug: 'coupang', Scraper: GreenhouseScraper },
  { name: 'Datadog', slug: 'datadog', Scraper: GreenhouseScraper },
  { name: 'IonQ', slug: 'ionq', Scraper: GreenhouseScraper },
  { name: 'MongoDB', slug: 'mongodb', Scraper: GreenhouseScraper },
  { name: 'NetEase', slug: 'netease', Scraper: AshbyScraper },
  { name: 'Pure Storage', slug: 'purestorage', Scraper: GreenhouseScraper },
  { name: 'Reddit', slug: 'reddit', Scraper: GreenhouseScraper },
  { name: 'Robinhood', slug: 'robinhood', Scraper: GreenhouseScraper },
  { name: 'Roku', slug: 'roku', Scraper: GreenhouseScraper },
  { name: 'Samsara', slug: 'samsara', Scraper: GreenhouseScraper },
  { name: 'Snowflake', slug: 'snowflake', Scraper: AshbyScraper },
  { name: 'SoFi', slug: 'sofi', Scraper: GreenhouseScraper },
  { name: 'Spotify', slug: 'spotify', Scraper: LeverScraper },
  { name: 'Twilio', slug: 'twilio', Scraper: GreenhouseScraper },
  { name: 'Zscaler', slug: 'zscaler', Scraper: GreenhouseScraper },
];
