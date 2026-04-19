import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './constants.ts';
import { ListedJobStr, type ListedJob } from './scraping/Scraper.ts';
import { inlineInterface } from './types.ts';
import {
  dedent,
  getGeoLocation,
  ollamaChat,
  type GeoLocation,
} from './utils.ts';

export interface JobFitResponse {
  fitScore: number;
  pros: string;
  cons: string;
}
export const JobFitResponseStr = inlineInterface(`
interface JobFitResponse {
  fitScore: number;
  pros: string;
  cons: string;
}
`);

type ListedJobSansId = Omit<ListedJob, 'id'>;

export class Analyzer {
  static jobAnalyzePrompt = dedent(`
    # Purpose
    Your job is to determine whether a given job posting is a good fit for the user, based on their location, resume, and job preferences listed below.

    ## Output format
    You should output using JSON format, using ONLY this schema:
    \`\`\`typescript
    ${JobFitResponseStr}
    \`\`\`

    Reasoning should be kept very brief and not overly wordy; the user will be viewing your assessment in a list of many analyzed jobs, so they should be able to quickly breeze past your reasoning for each job; keep it short and to-the-point. Here are some example responses:

    \`\`\`json
    { "fitScore": 1, "pros": "Job is remote, matches user's experience in infrastructure engineering, matches user's preference for a large company", "cons": "" }
    \`\`\`

    \`\`\`json
    { "fitScore": 0.25, "pros": "Job is a good match for the user's experience", "cons": "Job is fully on-site, which the user has explicitly stated they aren't interested in" }
    \`\`\`

    \`\`\`json
    { "fitScore": 0, "pros": "", "cons": "Job is based outside of the user's country" }
    \`\`\`

    ## Responsibility
    The user is trusting you to process their info and the info of a job from their persective. Imagine you are the user and use that to determine whether you would want to do the job they provide. Be strict with your fitness score, don't try to imagine a scenario where a job might be a fit for them. If it's not a fit, it's not a fit; and your fitness score should reflect that. **IMPORTANT** Also note that if the location doesn't match the user's location, it's likely not a good fit (unless it's fully remote); unless the user explicitly states that they're open to travel or move for a job, ASSUME THEY ARE NOT OPEN TO THAT.
  `);
  static reduceJobListPrompt = dedent(`
    # Purpose
    Your job is to reduce a list of job postings provided by the user, based on whether each job potentially may be a good fit for the user, based on their location, resume, and job preferences listed below.

    ## Job listing format
    A job listing follows this schema:
    \`\`\`typescript
    ${ListedJobStr}
    \`\`\`

    The user will provide you with an array of jobs in this format, and you're expected to respond with a subset of the provided list of jobs.

    ## Output format
    You should output using JSON format, and it should consist only of a top-level array containing job listings. DO NOT MODIFY ANYTHING ABOUT THE JOBS LISTED, THE LIST YOU RESPOND WITH MUST BE EXACTLY A SUBSET OF THE PROVIDED LIST.

    ### Examples

    #### User is looking for software engineering roles

    **Input**
    \`\`\`json
    [
      {"title":"Legal Operations Specialist","location":"..."},
      {"title":"Senior Software Engineer","location":"..."}
    ]
    \`\`\`
    **Output**
    \`\`\`json
    [
      {"title":"Senior Software Engineer","location":"..."}
    ]
    \`\`\`

    #### User is looking for software engineering roles, and is located in London, UK.

    **Input**
    \`\`\`json
    [
      {"title":"Software Engineer","location":"London, UK"},
      {"title":"Software Engineer","location":"San Francisco, CA"}
    ]
    \`\`\`
    **Output**
    \`\`\`json
    [
      {"title":"Software Engineer","location":"London, UK"}
    ]
    \`\`\`

    **NOTE**: some job listings provide the location in the job title, and instead use the \`location\` field to indicate whether it's in-office, remote, etc.; so make sure to look in the \`title\` if the \`location\` isn't clear.
  `);

  // TODO: somehow make this configurable and not necessarily ollama (e.g. chatgpt, claude)
  private model = 'gemma4:e4b';
  private userInfoPrompt!: string;

  private initialized = false;
  async init() {
    this.userInfoPrompt = this.generateUserInfoPrompt.apply(
      this,
      await Promise.all([
        fs.readFile(path.join(dataDir, 'resume.md'), 'utf-8'),
        fs.readFile(path.join(dataDir, 'job-preferences.md'), 'utf-8'),
        getGeoLocation(),
      ])
    );

    this.initialized = true;
  }

  async analyzeJob(jobMarkdown: string): Promise<JobFitResponse> {
    this.checkInit();

    const sysPrompt = Analyzer.jobAnalyzePrompt + '\n\n' + this.userInfoPrompt;
    return ollamaChat<JobFitResponse>(this.model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: jobMarkdown },
    ]);
  }

  async reduceJobList(
    jobs: ListedJob[]
  ): Promise<[jobs: ListedJob[], errors: Error[]]> {
    const errors: Error[] = [];
    this.checkInit();

    // 'id' in this context is a unique identifier based on
    // the fields included to the model, so we can rebuild
    // the full `ListedJob` after truncating it for the model
    const generateJobId = (job: ListedJobSansId) =>
      (job.title + job.location).replace(/ /g, '');

    const jobsWithoutUrls: ListedJobSansId[] = [];
    const jobsById = new Map<string, ListedJob>();
    for (const job of jobs) {
      const { title, location } = job;
      jobsById.set(generateJobId(job), job);
      jobsWithoutUrls.push({ title, location });
    }

    const sysPrompt =
      Analyzer.reduceJobListPrompt + '\n\n' + this.userInfoPrompt;
    const response = (await ollamaChat(this.model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: JSON.stringify(jobsWithoutUrls) },
    ])) as any;

    function normalizeJobListResponse(res: any): ListedJobSansId[] {
      if (typeof res === 'object') {
        if (Array.isArray(res)) {
          return res as ListedJobSansId[];
        } else {
          const keys = Object.keys(res);
          // this means it just put the array in a top-level object
          // (despite being asked not to...)
          if (keys.length === 1 && Array.isArray(res[keys[0]])) {
            return res[keys[0]] as ListedJobSansId[];
          }
        }
      }

      throw new Error(`Unexpected response from ollama`);
    }

    const filteredJobList = normalizeJobListResponse(response);
    // re-add ids into jobs
    const result: ListedJob[] = [];
    for (const job of filteredJobList) {
      const id = generateJobId(job);
      if (!jobsById.has(id)) {
        const error = new Error(`Job in filtered list not found in original`);
        // @ts-expect-error
        error.job = job;
        errors.push(error);
        continue;
      }

      result.push(jobsById.get(id)!);
    }

    return [result, errors];
  }

  private generateUserInfoPrompt(
    resume: string,
    prefs: string,
    geo: GeoLocation
  ) {
    let result = dedent(`
      # User information

      ## Location
      Country: ${geo.country}
      State: ${geo.regionName}
      City: ${geo.city}
    `);

    result += `\n\n## Resume\n`;
    result += `\`\`\`\`md\n`;
    result += resume;
    result += `\n\`\`\`\``;

    result += `\n\n## Job preferences (**IMPORTANT**)\n`;
    result += `\`\`\`\`md\n`;
    result += prefs;
    result += `\n\`\`\`\``;

    return result;
  }

  private checkInit() {
    if (!this.initialized)
      throw new Error(`Analyzer 'init' must be run before running analysis`);
  }
}
