import assert from 'node:assert';
import { cachedFetch } from '../fetch.ts';
import { time } from '../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

interface LeverJob {
  id: string;
  text: string;
  categories: {
    location?: string;
    allLocations?: string[];
  };
  descriptionPlain: string;
  descriptionBodyPlain: string;
  hostedUrl: string;
  lists: { text: string; content: string }[];
  additionalPlain: string;
}

export class LeverScraper extends Scraper {
  private jobsCache = new Map<string, LeverJob>();

  [Symbol.dispose]() {
    // force this out of memory just to be sure
    this.jobsCache.clear();
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    let url = `https://api.lever.co/v0/postings/${this.companySlug}?mode=json`;
    if (testing) {
      url += '&limit=1';
    }
    const jobs = (await cachedFetch
      .call({ cache: !testing, cacheTTL: time.day }, url)
      .then((res) => res.json())) as LeverJob[];

    this.jobsCache.clear();
    for (const job of jobs) {
      this.jobsCache.set(job.id, job);
    }

    return jobs.map((job) => ({
      id: job.id,
      url: job.hostedUrl,
      title: job.text,
      location:
        job.categories.allLocations?.join(', ') ??
        job.categories.location ??
        '',
    }));
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
