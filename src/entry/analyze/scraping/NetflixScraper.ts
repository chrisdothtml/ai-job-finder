import { cachedFetch } from '../../../fetch.ts';
import { buildUrl, time } from '../../../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

const BASE_URL = 'https://explore.jobs.netflix.net';
const DOMAIN = 'netflix.com';
const PAGE_SIZE = 100;

interface NetflixPosition {
  canonicalPositionUrl: string;
  id: number;
  name: string;
  location: string;
  locations: string[];
}

interface NetflixJobsResponse {
  positions: NetflixPosition[];
  count: number;
}

interface NetflixJobDetail {
  id: number;
  name: string;
  location: string;
  locations: string[];
  department: string;
  ats_job_id: string;
  job_description: string;
  work_location_option: string;
}

export class NetflixScraper extends Scraper {
  async getJobsList(testing = false): Promise<ListedJob[]> {
    const jobs: ListedJob[] = [];
    let start = 0;

    while (true) {
      const url = buildUrl(BASE_URL, '/api/apply/v2/jobs', {
        domain: DOMAIN,
        start,
        num: testing ? 1 : PAGE_SIZE,
        sort_by: 'relevance',
      });
      const data = (await cachedFetch
        .call({ cache: !testing, cacheTTL: time.day }, url)
        .then((r) => r.json())) as NetflixJobsResponse;

      for (const pos of data.positions) {
        jobs.push({
          id: String(pos.id),
          url: pos.canonicalPositionUrl,
          title: pos.name,
          location: pos.locations.join(', ') || pos.location,
        });
        if (testing) break;
      }

      start += data.positions.length;
      if (testing || start >= data.count || data.positions.length === 0) break;
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const url = buildUrl(BASE_URL, `/api/apply/v2/jobs/${id}`, {
      domain: DOMAIN,
    });
    const data = (await cachedFetch
      .call({ cacheTTL: time.day }, url)
      .then((r) => r.json())) as NetflixJobDetail;
    return JSON.stringify(data);
  }
}
