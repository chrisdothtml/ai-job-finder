import assert from 'node:assert';
import { cachedFetch } from '../fetch.ts';
import { time } from '../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

const BASE_URL = 'https://explore.jobs.netflix.net';
const DOMAIN = 'netflix.com';
const PAGE_SIZE = 100;

interface NetflixPosition {
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
      const url = `${BASE_URL}/api/apply/v2/jobs?domain=${DOMAIN}&start=${start}&num=${PAGE_SIZE}&sort_by=relevance`;
      const data = (await cachedFetch
        .call({ cache: !testing, cacheTTL: time.day }, url)
        .then((r) => r.json())) as NetflixJobsResponse;

      for (const pos of data.positions) {
        jobs.push({
          id: String(pos.id),
          title: pos.name,
          location: pos.locations.join(', ') || pos.location,
        });
      }

      start += data.positions.length;
      if (start >= data.count || data.positions.length === 0) break;
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const url = `${BASE_URL}/api/apply/v2/jobs/${id}?domain=${DOMAIN}`;
    const data = (await cachedFetch
      .call({ cacheTTL: time.day }, url)
      .then((r) => r.json())) as NetflixJobDetail;
    return JSON.stringify(data);
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

      const content = await this.getJobContent(firstJob.id);
      assert.ok(typeof content === 'string');
      assert.ok(content.length > 0);
    }
  }
}
