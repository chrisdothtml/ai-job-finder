import { AshbyScraper } from '../scraping/AshbyScraper.ts';
import { GitHubScraper } from '../scraping/GitHubScraper.ts';
import { GreenhouseScraper } from '../scraping/GreenhouseScraper.ts';
import { LeverScraper } from '../scraping/LeverScraper.ts';
import { NetflixScraper } from '../scraping/NetflixScraper.ts';
import { NvidiaScraper } from '../scraping/NvidiaScraper.ts';
import { type ScraperSubclass } from '../scraping/Scraper.ts';
import { ShopifyScraper } from '../scraping/ShopifyScraper.ts';

interface TechCompany {
  name: string;
  Scraper: ScraperSubclass;
}

export const companies: Record<string, TechCompany> = {
  airbnb: { name: 'Airbnb', Scraper: GreenhouseScraper },
  anthropic: { name: 'Anthropic', Scraper: GreenhouseScraper },
  applovin: { name: 'AppLovin', Scraper: GreenhouseScraper },
  asteralabs: { name: 'Astera Labs', Scraper: GreenhouseScraper },
  block: { name: 'Block', Scraper: GreenhouseScraper },
  buildkite: { name: 'Buildkite', Scraper: GreenhouseScraper },
  cloudflare: { name: 'Cloudflare', Scraper: GreenhouseScraper },
  coinbase: { name: 'Coinbase', Scraper: GreenhouseScraper },
  coreweave: { name: 'CoreWeave', Scraper: GreenhouseScraper },
  coupang: { name: 'Coupang', Scraper: GreenhouseScraper },
  datadog: { name: 'Datadog', Scraper: GreenhouseScraper },
  figma: { name: 'Figma', Scraper: GreenhouseScraper },
  github: { name: 'GitHub', Scraper: GitHubScraper },
  ionq: { name: 'IonQ', Scraper: GreenhouseScraper },
  mongodb: { name: 'MongoDB', Scraper: GreenhouseScraper },
  mozilla: { name: 'Mozilla', Scraper: GreenhouseScraper },
  netease: { name: 'NetEase', Scraper: AshbyScraper },
  netflix: { name: 'Netflix', Scraper: NetflixScraper },
  nvidia: { name: 'NVIDIA', Scraper: NvidiaScraper },
  openai: { name: 'OpenAI', Scraper: AshbyScraper },
  purestorage: { name: 'Pure Storage', Scraper: GreenhouseScraper },
  reddit: { name: 'Reddit', Scraper: GreenhouseScraper },
  robinhood: { name: 'Robinhood', Scraper: GreenhouseScraper },
  roku: { name: 'Roku', Scraper: GreenhouseScraper },
  samsara: { name: 'Samsara', Scraper: GreenhouseScraper },
  shopify: { name: 'Shopify', Scraper: ShopifyScraper },
  snowflake: { name: 'Snowflake', Scraper: AshbyScraper },
  sofi: { name: 'SoFi', Scraper: GreenhouseScraper },
  spotify: { name: 'Spotify', Scraper: LeverScraper },
  twilio: { name: 'Twilio', Scraper: GreenhouseScraper },
  vercel: { name: 'Vercel', Scraper: GreenhouseScraper },
  zscaler: { name: 'Zscaler', Scraper: GreenhouseScraper },
};
