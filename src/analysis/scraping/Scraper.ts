import builtinAssert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type TestContext } from 'node:test';
import { dataDir } from '../../constants.ts';

export abstract class Scraper {
  constructor(
    protected companySlug: string,
    private signal: AbortSignal | null = null
  ) {}
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

  private async runTest(assert: TestAssert) {
    const jobs = await this.getJobsList(true);

    const firstJob = jobs[0];
    assert.ok(isListedJob(firstJob));

    const job = await this.getJobContent(firstJob.id);
    assert.ok(typeof job === 'string', 'Job content is a string');
    assert.ok(job.length > 0, 'Job content is not empty');
  }

  async _test(t?: TestContext) {
    // allow to be called manually or as part of a node test run
    return this.runTest((t ? t.assert : builtinAssert) as TestAssert);
  }

  /**
   * Saves the jobs list and first job to json files in the data
   * dir for debugging
   */
  async _dumpData() {
    const jobsFilePath = path.join(dataDir, `${this.companySlug}-jobs.json`);
    const jobFilePath = path.join(dataDir, `${this.companySlug}-job.json`);

    const jobs = await this.getJobsList();
    await fs.writeFile(jobsFilePath, JSON.stringify(jobs, null, 2));
    await fs.writeFile(jobFilePath, await this.getJobContent(jobs[0].id));
  }
}

type TestAssert = typeof builtinAssert;

export type ScraperSubclass = new (...args: any[]) => Scraper;

const listedJobType = {
  title: 'Software Engineer',
  location: 'United States',
  id: '00000',
  url: 'https://foo.com/bar',
};

export type ListedJob = typeof listedJobType;

function isListedJob(job: { [key: string]: any }): boolean {
  const missingKeys: string[] = [];
  const typeMisMatches: string[] = [];
  const emptyValues: string[] = [];
  for (const [key, value] of Object.entries(listedJobType)) {
    if (!job.hasOwnProperty(key)) {
      missingKeys.push(key);
      continue;
    }

    const actualValue = job[key];
    const expectedType = typeof value;
    const actualType = typeof actualValue;
    if (actualType !== expectedType) {
      typeMisMatches.push(
        `'${key}': '${actualType}' expected to be '${expectedType}'`
      );
      continue;
    }

    if (expectedType === 'string' && actualValue.length === 0) {
      emptyValues.push(key);
      continue;
    }
  }

  const errorLines: string[] = [];
  if (missingKeys.length > 0) {
    errorLines.push(`Missing keys: ${missingKeys.join(', ')}`);
  }
  if (typeMisMatches.length > 0) {
    errorLines.push(`Incorrect value types: ${typeMisMatches.join(', ')}`);
  }
  if (emptyValues.length > 0) {
    errorLines.push(`Empty values: ${emptyValues.join(', ')}`);
  }

  if (errorLines.length > 0) {
    throw new Error(
      `Job validation errors:\n` + errorLines.map((l) => '  - ' + l).join('\n')
    );
  }

  return true;
}
