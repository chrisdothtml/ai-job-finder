import assert from 'node:assert';
import { cachedFetch } from '../fetch.ts';
import { time } from '../utils.ts';
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
  address: AshbyAddress;
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

function formatAddress(address: AshbyAddress): string {
  const { addressLocality, addressCountry } = address.postalAddress;
  return [addressLocality, addressCountry].filter(Boolean).join(', ');
}

export class AshbyScraper extends Scraper {
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
        const loc = formatAddress(sec.address);
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

  async test() {
    const jobs = await this.getJobsList(true);

    if (jobs.length > 0) {
      const firstJob = jobs[0];
      for (const [key, val] of Object.entries(firstJob)) {
        assert.ok(
          typeof val === 'string' && val.length > 0,
          `fetched job has '${key}' prop`
        );
      }

      const job = await this.getJobContent(firstJob.id);
      assert.ok(typeof job === 'string');
      assert.ok(job.length > 0);
    }
  }
}
