import { cachedFetch } from '../../utils/fetch.ts';
import { time } from '../../utils/shared.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

interface WorkableLocation {
  country: string;
  city: string;
  region: string | null;
}

interface WorkableListedJob {
  shortcode: string;
  title: string;
  remote: boolean;
  location: WorkableLocation;
  locations: WorkableLocation[];
}

interface WorkableJobsResponse {
  total: number;
  results: WorkableListedJob[];
}

function formatLocation(loc: WorkableLocation): string {
  return [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
}

export default class WorkableScraper extends Scraper {
  private baseUrl: string;

  constructor(...args: ConstructorParameters<typeof Scraper>) {
    super(...args);
    this.baseUrl = `https://apply.workable.com/api/v3/accounts/${this.companySlug}`;
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const res = (await cachedFetch
      .call({ cache: !testing, cacheTTL: time.day }, `${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '',
          department: [],
          location: [],
          workplace: [],
          worktype: [],
        }),
      })
      .then((r) => r.json())) as WorkableJobsResponse;

    return res.results.map((job) => {
      const locations = [job.location, ...job.locations]
        .map(formatLocation)
        .filter(Boolean);

      return {
        id: job.shortcode,
        url: `https://apply.workable.com/${this.companySlug}/j/${job.shortcode}/`,
        title: job.title,
        location: [...new Set(locations)].join(', ') || 'Remote',
      };
    });
  }

  async getJobContent(id: string): Promise<string> {
    const res = await cachedFetch(
      `https://apply.workable.com/api/v2/accounts/${this.companySlug}/jobs/${id}`
    ).then((res) => res.json());
    return JSON.stringify(res);
  }
}
