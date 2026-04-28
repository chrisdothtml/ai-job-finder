import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from './constants.ts';
import { type ListedJob } from './scraping/Scraper.ts';
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

export class Analyzer {
  static prompts = {
    analyzeJob: dedent(`
      # Purpose
      Your job is to determine whether a given job posting is a good fit for the user, based on their location, resume, and job preferences listed below.

      ## Output format
      You should output using JSON format, using ONLY this schema:
      \`\`\`typescript
      interface JobFitResponse {
        // number between 0-1; e.g. 0, 0.1, ..., 0.9, 1.0
        fitScore: number;
        pros: string;
        cons: string;
      }
      \`\`\`

      Reasoning should be kept very brief and not overly wordy; the user will be viewing your assessment in a list of many analyzed jobs, so they should be able to quickly breeze past your reasoning for each job; keep it short and to-the-point. Also, word your reasoning as if you're talking to the user; don't talk about them in the third person. Here are some example responses:

      \`\`\`json
      { "fitScore": 1, "pros": "Job is remote, matches your experience in infrastructure engineering, matches your preference for a large company", "cons": "" }
      \`\`\`

      \`\`\`json
      { "fitScore": 0.25, "pros": "Job is a good match for your experience", "cons": "Job is fully on-site, which you've explicitly stated you aren't interested in" }
      \`\`\`

      \`\`\`json
      { "fitScore": 0, "pros": "", "cons": "Job is based outside of the user's country" }
      \`\`\`

      ## Responsibility
      The user is trusting you to process their info and the info of a job from their persective. Imagine you are the user and use that to determine whether you would want to do the job they provide. Be strict with your fitness score, don't try to imagine a scenario where a job might be a fit for them. If it's not a fit, it's not a fit; and your fitness score should reflect that. **IMPORTANT** Also note that if the location doesn't match the user's location, it's likely not a good fit (unless it's fully remote); unless the user explicitly states that they're open to travel or move for a job, ASSUME THEY ARE NOT OPEN TO THAT.
    `),
    reduceJobs: dedent(`
      # Purpose
      You are being used to reduce a list of job postings down to those that the user may actually be a good fit for, in terms of role match (based on preferences and past experience) and location preferences/restrictions.

      ## Job listing format
      A job listing follows this schema:
      \`\`\`typescript
      interface ListedJob {
        title: string;
        location: string;
      }
      \`\`\`

      ## Types of jobs
      1. Remote: This means the employee works full-time from home instead of commuting to an office. The employee typically still is required to be in the same country as the role being offered.
      2. Hybrid: This means that the job is partially remote, but still requires the employee to commute to the office for some number of days of the week. These jobs would require the employee to be located in both the same country and state as the role being offered, and likely the same area of the state as well (unless the user is willing to move for a role).
      3. In-office: This means the employee commutes to an office full-time, every day of the week. Same location restrictions as Hybrid. A role may not use the exact words "In-office"; assume if the role doesn't mention either "remote" or "hybrid", that it's an in-office role.

      ## Output format
      Respond with ONLY one token: true or false. Do not include punctuation, explanation, or whitespace.

      ### Examples

      #### User is a senior software engineer, located in San Francisco, California, looking for remote IC (individual contributor) roles
      **Input**: \`{"title":"Legal Operations Specialist - Remote","location":"San Francisco, California"}\`
      **Output**: \`false\`
      **Reasoning**: While the job is a good fit in terms of location, it's a legal role, not software engineering

      **Input**: \`{"title":"Sr Software Engineer","location":"In-office - San Francisco, California"}\`
      **Output**: \`false\`
      **Reasoning**: While the job is a good fit in terms of location and role, the user is strictly looking for remote roles

      **Input**: \`{"title":"Sr Software Engineer - Remote","location":"SF Bay Area"}\`
      **Output**: \`true\`
      **Reasoning**: This job is a good fit for the user all around

      **Input**: \`{"title":"Sr Software Engineer - Remote","location":"Austin, TX"}\`
      **Output**: \`true\`
      **Reasoning**: This job is a good fit for the user. The location is stated as "Austin, TX", but it's fully remote, so the user still fits

      **Input**: \`{"title":"Sr Software Engineer","location":"Remote - London, UK"}\`
      **Output**: \`false\`
      **Reasoning**: This job is a good fit for the user in terms of role, but it's located in "London, UK", which is a different country than the user

      **Input**: \`{"title":"Sr Software Engineer","location":"Austin, TX"}\`
      **Output**: \`true\`
      **Reasoning**: This job is a good fit for the user in terms of role, but the location is stated as "Austin, TX", and there is no mention of it being a remote role

      **Input**: \`{"title":"Software Engineering Intern","location":"Remote - US"}\`
      **Output**: \`false\`
      **Reasoning**: This job is a good fit for the user in terms of location, but they are a senior engineer, and this job is for an intern
    `),
    summarizeResume: dedent(`
      # Purpose
      Your job is to analyze the user's provided resume and reduce their work experience down to a brief summary of their work experience. This should be short (maximum paragraph), but should encompass all their past experience, technologies, and work types.

      The context is that your summary will be used as a first-pass to reduce a list of many available job titles, to those that match the user's past experience. You can take their job preferences into account to put emphasis on past experience relevant to their job search.
    `),
  };

  // TODO: somehow make this configurable and not necessarily ollama (e.g. chatgpt, claude)
  private model = 'gpt-oss:20b';
  private userInfoPrompt!: string;
  private userResumePrompt!: string;

  private initialized = false;
  async init() {
    [this.userInfoPrompt, this.userResumePrompt] =
      this.generateUserInfoPrompts.apply(
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

    const sysPrompt = [
      Analyzer.prompts.analyzeJob,
      this.userInfoPrompt,
      this.userResumePrompt,
    ].join('\n\n');
    const [response] = await ollamaChat(
      this.model,
      [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: jobMarkdown },
      ],
      { format: 'json' }
    );
    return response as Promise<JobFitResponse>;
  }

  async reduceJobList(
    jobs: ListedJob[]
  ): Promise<[jobs: ListedJob[], errors: Error[]]> {
    this.checkInit();

    const sysPrompt = [
      Analyzer.prompts.reduceJobs,
      this.userInfoPrompt,
      `## User work experience summary\n` +
        (await this.generateResumeSummary()),
    ].join('\n\n');

    const errors: Error[] = [];
    const result: ListedJob[] = [];
    for (const job of jobs) {
      const [response, convoId] = await ollamaChat(this.model, [
        { role: 'system', content: sysPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            title: job.title,
            location: job.location,
          }),
        },
      ]).then(([res, id]) => [res.trim(), id]);

      let shouldKeepJob: boolean;
      const boolMatchRx = /^(true|false)/;
      const [, shouldKeepJobStr] = response.match(boolMatchRx) || [];
      if (shouldKeepJobStr) {
        shouldKeepJob = shouldKeepJobStr === 'true';
      } else {
        const error = new Error(`Model didn't respond with a boolean`);
        // @ts-expect-error
        error.convoId = convoId;
        errors.push(error);
        continue;
      }

      if (shouldKeepJob) {
        result.push(job);
      }
    }

    return [result, errors];
  }

  private async generateResumeSummary(): Promise<string> {
    const sysPrompt = [
      Analyzer.prompts.summarizeResume,
      this.userInfoPrompt,
    ].join('\n\n');
    const [response] = await ollamaChat(this.model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: this.userResumePrompt },
    ]);

    return response;
  }

  private generateUserInfoPrompts(
    resume: string,
    prefs: string,
    geo: GeoLocation
  ) {
    let infoPrompt = dedent(`
      # User information

      ## Location
      Country: ${geo.country}
      State: ${geo.regionName}
      City: ${geo.city}
    `);

    infoPrompt += `\n\n## User Job preferences (**IMPORTANT**)\n`;
    infoPrompt += `\`\`\`\`md\n`;
    infoPrompt += prefs;
    infoPrompt += `\n\`\`\`\``;

    let resumePrompt = `\n\n## User Resume\n`;
    resumePrompt += `\`\`\`\`md\n`;
    resumePrompt += resume;
    resumePrompt += `\n\`\`\`\``;

    return [infoPrompt, resumePrompt];
  }

  private checkInit() {
    if (!this.initialized)
      throw new Error(`Analyzer 'init' must be run before running analysis`);
  }
}
