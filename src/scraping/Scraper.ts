import { inlineInterface } from '../types.ts';

export interface ListedJob {
  title: string;
  location: string;
  url: string;
}
// `url` is excluded for the prompt version of this, as we don't
// include it to reduce tokens used
export const ListedJobStr = inlineInterface(`
interface ListedJob {
  title: string;
  location: string;
}
`);

export abstract class Scraper {
  abstract getJobsList: () => Promise<ListedJob[]>;
  abstract getJobMarkdown: (url: string) => Promise<string>;
}
