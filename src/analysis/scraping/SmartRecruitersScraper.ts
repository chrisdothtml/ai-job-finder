import { cachedFetch } from '../../utils/fetch.ts';
import { time } from '../../utils/shared.ts';
import { Scraper, type ListedJob } from './Scraper.ts';

interface SmartRecruitersLocation {
  city: string;
  region: string;
  country: string;
  fullLocation: string;
}

interface SmartRecruitersPosting {
  id: string;
  name: string;
  location: SmartRecruitersLocation;
}

interface SmartRecruitersPostingsResponse {
  offset: number;
  limit: number;
  totalFound: number;
  content: SmartRecruitersPosting[];
}

export default class SmartRecruitersScraper extends Scraper {
  private baseUrl: string;

  constructor(...args: ConstructorParameters<typeof Scraper>) {
    super(...args);
    this.baseUrl = `https://api.smartrecruiters.com/v1/companies/${this.companySlug}/postings`;
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const postings: SmartRecruitersPosting[] = [];
    let offset = 0;

    while (true) {
      const res = (await cachedFetch
        .call(
          { cache: !testing, cacheTTL: time.day },
          `${this.baseUrl}?offset=${offset}`
        )
        .then((r) => r.json())) as SmartRecruitersPostingsResponse;

      postings.push(...res.content);
      if (testing || postings.length >= res.totalFound) break;
      offset += res.limit;
    }

    return postings.map((posting) => ({
      id: posting.id,
      url: `https://jobs.smartrecruiters.com/${this.companySlug}/${posting.id}`,
      title: posting.name,
      location: posting.location.fullLocation,
    }));
  }

  async getJobContent(id: string): Promise<string> {
    const res = await cachedFetch(`${this.baseUrl}/${id}`).then((res) =>
      res.json()
    );
    return JSON.stringify(res);
  }
}
