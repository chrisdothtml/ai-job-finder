import { cachedFetch } from '../fetch.ts';
import { time } from '../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

const BASE_URL = 'https://www.github.careers';
const PAGE_SIZE = 100;

interface GitHubJobData {
  slug: string;
  title: string;
  description: string;
  full_location: string;
  location_name: string;
  country: string;
  categories: string[];
  qualifications: string;
  responsibilities: string;
  salary_min_value: number | null;
  salary_max_value: number | null;
  employment_type: string;
  posted_date: string;
  apply_url: string;
}

interface GitHubJobsResponse {
  jobs: Array<{ data: GitHubJobData }>;
  totalCount: number;
}

export class GitHubScraper extends Scraper {
  async getJobsList(testing = false): Promise<ListedJob[]> {
    const jobs: ListedJob[] = [];
    let page = 1;

    while (true) {
      const url = `${BASE_URL}/api/jobs?page=${page}&sortBy=relevance&descending=false&internal=false&limit=${PAGE_SIZE}`;
      const data = (await cachedFetch
        .call({ cache: !testing, cacheTTL: time.day }, url)
        .then((r) => r.json())) as GitHubJobsResponse;

      for (const { data: job } of data.jobs) {
        jobs.push({
          id: job.slug,
          url: `${BASE_URL}/careers-home/jobs/${job.slug}?lang=en-us`,
          title: job.title,
          location: job.full_location || job.location_name || job.country,
        });
      }

      if (jobs.length >= data.totalCount || data.jobs.length === 0) break;
      page++;
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const url = `${BASE_URL}/api/jobs?page=1&sortBy=relevance&descending=false&internal=false&limit=1&req_id=${id}`;
    const data = (await cachedFetch
      .call({ cacheTTL: time.day }, url)
      .then((r) => r.json())) as GitHubJobsResponse;
    return JSON.stringify(data.jobs[0]?.data ?? {});
  }
}
