import { inlineInterface } from '../types.ts';

export interface ListedJob {
  title: string;
  location: string;
  id: string;
}
// `id` is excluded for the prompt version of this, as we don't
// include it to reduce tokens used
export const ListedJobStr = inlineInterface(`
interface ListedJob {
  title: string;
  location: string;
}
`);

export abstract class Scraper {
  constructor(protected companySlug: string) {}

  abstract getJobsList(): Promise<ListedJob[]>;
  abstract getJobContent(id: string): Promise<string>;
}
