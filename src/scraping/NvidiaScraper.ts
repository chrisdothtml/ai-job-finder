import { cachedFetch } from '../fetch.ts';
import { buildUrl, time } from '../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

const BASE_URL = 'https://jobs.nvidia.com';
const DOMAIN = 'nvidia.com';
const PAGE_SIZE = 100;

interface NvidiaPosition {
  id: number;
  name: string;
  locations: string[];
  positionUrl: string;
}

interface NvidiaSearchResponse {
  data: {
    positions: NvidiaPosition[];
    count: number;
  };
}

interface NvidiaDetailResponse {
  data: {
    id: number;
    name: string;
    locations: string[];
    department: string;
    atsJobId: string;
    jobDescription: string;
    workLocationOption: string;
  };
}

export class NvidiaScraper extends Scraper {
  async getJobsList(testing = false): Promise<ListedJob[]> {
    const jobs: ListedJob[] = [];
    let start = 0;

    while (true) {
      const url = buildUrl(BASE_URL, '/api/pcsx/search', {
        domain: DOMAIN,
        query: '',
        location: '',
        start,
        num: testing ? 1 : PAGE_SIZE,
      });
      const { data } = (await cachedFetch
        .call({ cache: !testing, cacheTTL: time.day }, url)
        .then((r) => r.json())) as NvidiaSearchResponse;

      for (const pos of data.positions) {
        jobs.push({
          id: String(pos.id),
          url: `${BASE_URL}${pos.positionUrl}`,
          title: pos.name,
          location: pos.locations.join(', '),
        });
        if (testing) break;
      }

      start += data.positions.length;
      if (testing || start >= data.count || data.positions.length === 0) break;
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const url = buildUrl(BASE_URL, '/api/pcsx/position_details', {
      position_id: id,
      domain: DOMAIN,
      hl: 'en',
    });
    const { data } = (await cachedFetch
      .call({ cacheTTL: time.day }, url)
      .then((r) => r.json())) as NvidiaDetailResponse;
    return JSON.stringify(data);
  }
}
