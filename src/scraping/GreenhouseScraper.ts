import { cachedFetch } from '../fetch.ts';
import { time } from '../utils.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

export interface GreenhouseListedJob {
  absolute_url: string;
  id: number;
  title: string;
  location: { name: string };
  metadata?: { name: string; value: string | string[] }[];
}

export interface GreenhouseJobList {
  jobs: GreenhouseListedJob[];
}

export class GreenhouseScraper extends Scraper {
  private baseUrl: string;

  constructor(...args: ConstructorParameters<typeof Scraper>) {
    super(...args);
    this.baseUrl = `https://boards-api.greenhouse.io/v1/boards/${this.companySlug}/jobs`;
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const res = (await cachedFetch
      .call({ cache: !testing, cacheTTL: time.day }, this.baseUrl)
      .then((res) => res.json())) as GreenhouseJobList;

    return res.jobs.map((job) => {
      let location = job.location.name;
      if (Array.isArray(job.metadata)) {
        const secLocation = job.metadata.find(
          (m) => m.name === 'Job Posting Location'
        );

        if (secLocation?.value) {
          location += ' - ';
          location += Array.isArray(secLocation.value)
            ? secLocation.value.join(', ')
            : secLocation.value;
        }
      }

      return {
        id: job.id.toString(),
        url: job.absolute_url,
        title: job.title,
        location,
      };
    });
  }

  async getJobContent(id: string): Promise<string> {
    const res = await cachedFetch(`${this.baseUrl}/${id}`).then((res) =>
      res.json()
    );
    return JSON.stringify(res);
  }
}
