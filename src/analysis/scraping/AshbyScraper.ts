import { cachedFetch } from '../../utils/fetch.ts';
import { time } from '../../utils/shared.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

interface AshbyAddress {
  postalAddress: {
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
}

interface AshbySecondaryLocation {
  location: string;
  address: AshbyAddress | null;
}

interface AshbyPosting {
  id: string;
  title: string;
  department: string;
  team: string;
  employmentType: string;
  location: string;
  secondaryLocations: AshbySecondaryLocation[];
  isListed: boolean;
  isRemote: boolean | null;
  workplaceType: string | null;
  jobUrl: string;
  descriptionPlain: string;
  compensation: unknown;
}

interface AshbyJobBoard {
  jobs: AshbyPosting[];
}

function formatAddress(sec: AshbySecondaryLocation): string {
  if (!sec.address) return sec.location;
  const { addressLocality, addressCountry } = sec.address.postalAddress;
  return (
    [addressLocality, addressCountry].filter(Boolean).join(', ') || sec.location
  );
}

export default class AshbyScraper extends Scraper {
  private jobsCache = new Map<string, AshbyPosting>();

  [Symbol.dispose]() {
    this.jobsCache.clear();
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${this.companySlug}?includeCompensation=true`;
    const res = (await cachedFetch
      .call({ cache: !testing, cacheTTL: time.day }, url)
      .then((r) => r.json())) as AshbyJobBoard;

    this.jobsCache.clear();
    for (const posting of res.jobs) {
      this.jobsCache.set(posting.id, posting);
    }

    return res.jobs.map((posting) => {
      const locations = [posting.location];
      for (const sec of posting.secondaryLocations) {
        const loc = formatAddress(sec);
        if (loc && !locations.includes(loc)) locations.push(loc);
      }
      return {
        id: posting.id,
        url: posting.jobUrl,
        title: posting.title,
        location: locations.join(', '),
      };
    });
  }

  async getJobContent(id: string): Promise<string> {
    const job = this.jobsCache.get(id);
    if (!job) throw new Error(`Job ${id} not found in cache`);
    return JSON.stringify(job);
  }
}
