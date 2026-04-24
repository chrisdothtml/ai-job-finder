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
  // allow to be used via `using foo = new Scraper()`
  [Symbol.dispose]() {}

  /**
   * Gets the full list of jobs
   */
  abstract getJobsList(testing?: boolean): Promise<ListedJob[]>;
  /**
   * Gets a full job from the id. May be plaintext, markdown,
   * or a stringified JSON object
   */
  abstract getJobContent(id: string): Promise<string>;
  /**
   * Used to validate that a Scraper is still working as expected
   * (in case an API or scraping method stops working)
   */
  abstract test(): Promise<void>;
}
