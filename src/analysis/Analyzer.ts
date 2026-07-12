import { type LLM } from '../LLMs/_LLM.ts';
import { Ollama } from '../LLMs/Ollama.ts';
import { resolveLLM } from '../LLMs/resolveLLM.ts';
import { geocode, haversineMiles, type GeocodedPlace } from '../utils/geo.ts';
import { dedent } from '../utils/shared.ts';
import { type ListedJob } from './scraping/Scraper.ts';
import { type AnalyzerSettings, type UserInfo } from './types.ts';

export interface JobFitResponse {
  fitScore: number;
  pros: string;
  cons: string;
}

export interface JobLocationInfo {
  /** normalized location, e.g. "Foster City, California, US" or "Remote, US" */
  location: string;
  isRemote: boolean;
  /** straight-line miles from the user's home; null when remote/unknown or geocoding failed */
  distanceMiles: number | null;
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

      Rules for \`pros\`/\`cons\` (the user will be scanning your assessment in a list of MANY analyzed jobs, so brevity is critical):
      - Each must be at most 2 short sentences (roughly 30 words total). Never exceed this.
      - Only mention the few factors that most affect the decision (role match, location/commute, explicit user preferences). Do NOT enumerate every matching skill or restate the resume/posting.
      - Word it as if you're talking to the user; don't talk about them in the third person.
      - No filler or hedging (e.g. "but that's acceptable", "otherwise no major drawbacks"); if there's nothing meaningful to say, use an empty string.

      Example responses:

      \`\`\`json
      { "fitScore": 1, "pros": "Remote, and a strong match for your infrastructure engineering experience", "cons": "" }
      \`\`\`

      \`\`\`json
      { "fitScore": 0.4, "pros": "Strong match for your platform engineering background", "cons": "Hybrid 3 days/week in Sunnyvale, ~30 mi from you and outside your preferred commute areas" }
      \`\`\`

      \`\`\`json
      { "fitScore": 0.25, "pros": "Good match for your experience", "cons": "Fully on-site, which you've explicitly stated you aren't interested in" }
      \`\`\`

      \`\`\`json
      { "fitScore": 0, "pros": "", "cons": "Based outside of your country" }
      \`\`\`

      ## Location & commute
      The user message may include a pre-computed "Job location" section containing the job's closest listed location to the user and its real straight-line distance from the user's home. Treat that data as ground truth; NEVER guess at proximity or describe a location as "near" the user without checking the distance. That data is derived from the job's listing though, so if the full posting explicitly contradicts it (e.g. states the role can be remote), the posting wins.

      For hybrid/in-office roles, judge the commute using the user's stated location preferences FIRST, and only then the distance: if they name specific acceptable cities/areas for on-site work, interpret that strictly. The job must be in one of those cities or immediately adjacent; a job in any other city is a location mismatch (cap fitScore at 0.5) even when the distance seems small. Do NOT use the distance to override this (e.g. if the user says hybrid near Oakland or San Francisco is okay, a hybrid job in Foster City is still a location mismatch, even at ~14 miles away). Only when their preferences don't name areas, use distance alone: assume anything over ~30 miles is an impractical regular commute. Keep in mind that straight-line distance understates real commutes (bridges, water crossings, traffic).

      When commute affects your assessment, cite the actual city and distance (e.g. "Foster City, ~14 mi from you"); NEVER use vague proximity phrases like "near you" or "near <city>".

      ## Scoring
      The user is trusting you to process their info and the info of a job from their perspective. Imagine you are the user and use that to determine whether you would want to do the job they provide. Be strict; don't try to imagine a scenario where a job might work out. If the location doesn't match the user's location, it's likely not a good fit (unless it's fully remote); unless the user explicitly states they're open to travel or move for a job, ASSUME THEY ARE NOT.

      Calibrate fitScore like this:
      - 0.9-1.0: strong role match AND the location works (remote, or comfortably within the user's commute preferences)
      - 0.6-0.8: good role match with minor concerns
      - 0.3-0.5: good role match but impractical location/commute, or workable location but a mediocre role match
      - 0.0-0.2: a role type the user excluded, or a location that isn't viable at all (e.g. different country, no remote option)

      A role type the user explicitly excluded (e.g. management, or a domain they said they're not a fit for) caps the score at 0.5 no matter how well the skills match; likewise, an impractical location caps the score at 0.5 no matter how good the role match is. Don't rationalize a weak match into a fit: if the posting's primary emphasis is on work the user said they're weak in or not seeking, that's a mediocre role match (0.3-0.5) even when many of their skills overlap. When a posting spans multiple possible teams or areas (e.g. "team placement occurs after the interview process"), judge fit by the posting's overall emphasis, not by the single best-case team the user could land on.
    `),
    resolveJobLocation: dedent(`
      # Purpose
      You are given the location (or list of locations) attached to a single job listing. Determine the one listed location that is closest to the user (their location is listed below) and respond with it in a normalized format.

      ## Output format
      Respond with ONLY the normalized location; no explanation, quotes, or extra punctuation. Use exactly one of these formats:
      1. "<city>, <region>, <country code>" (e.g. "San Francisco, California, US"): the listed location closest to the user
      2. "Remote, <country code>" (e.g. "Remote, US"): the listing is remote; if it offers both remote and physical locations, treat it as remote
      3. "Unknown": no city can be determined (e.g. the listing only says "United States")

      Expand abbreviations (e.g. "SF" becomes "San Francisco", "CA" becomes "California"). For metro areas (e.g. "SF Bay Area"), use the principal city.

      ### Examples (for a user located in Oakland, California, US)
      **Input**: Foster City, CA
      **Output**: Foster City, California, US

      **Input**: Remote - United States
      **Output**: Remote, US

      **Input**: San Francisco, CA | New York, NY | Seattle, WA
      **Output**: San Francisco, California, US

      **Input**: NYC or Remote (US)
      **Output**: Remote, US

      **Input**: United States
      **Output**: Unknown
    `),
    potentialJobFit: dedent(`
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

      ## Output format
      Respond with ONLY the summary: a single paragraph of plain sentences, at most ~150 words. No headings, bullet points, bold text, or any other markdown formatting, and no preamble like "Here's a summary of...".

      Write the summary in the first person, as if you are the user describing your own work experience (e.g. "I'm a senior software engineer with 10 years of experience building...").
    `),
  };

  private llm: LLM;
  private userInfoPrompt: string;
  private userLocationPrompt: string;
  private userResumePrompt: string;
  private userResumeSummaryPrompt: string;
  /** memoized geocode of the user's home location */
  private userPlacePromise: Promise<GeocodedPlace | null> | null = null;

  constructor(
    private settings: AnalyzerSettings,
    signal: AbortSignal
  ) {
    this.llm = resolveLLM(settings.config, signal);
    [
      this.userInfoPrompt,
      this.userLocationPrompt,
      this.userResumePrompt,
      this.userResumeSummaryPrompt,
    ] = this.generateUserPrompts(settings.userInfo);
  }

  /**
   * Pre-load the analysis model into memory (if llm is Ollama)
   */
  async preloadModel() {
    if (this.llm instanceof Ollama) {
      await this.llm.loadModel(this.settings.config.model);
    }
  }

  /**
   * Unload the analysis model (if llm is Ollama)
   */
  async unloadModel() {
    if (this.llm instanceof Ollama) {
      await this.llm.unloadModel(this.settings.config.model);
    }
  }

  async generateResumeSummary(): Promise<string> {
    const { config, userInfo } = this.settings;
    const sysPrompt = [
      Analyzer.prompts.summarizeResume,
      this.userInfoPrompt,
    ].join('\n\n');

    const [response] = await this.llm.chat(config.model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: this.userResumePrompt },
    ]);

    userInfo.resumeSummary = response;
    [, , , this.userResumeSummaryPrompt] = this.generateUserPrompts(userInfo);
    return response;
  }

  async analyzeJob(
    jobMarkdown: string,
    locationInfo?: JobLocationInfo | null
  ): Promise<JobFitResponse> {
    const { config } = this.settings;
    const sysPrompt = [
      Analyzer.prompts.analyzeJob,
      this.userInfoPrompt,
      this.userResumePrompt,
    ].join('\n\n');

    let userContent = jobMarkdown;
    if (locationInfo && !/^unknown$/i.test(locationInfo.location)) {
      const lines = [`# Job location (pre-computed)`];
      if (locationInfo.isRemote) {
        lines.push(`This job is remote (${locationInfo.location})`);
      } else {
        lines.push(
          `Closest listed location to the user: ${locationInfo.location}`
        );
        if (locationInfo.distanceMiles !== null) {
          lines.push(
            `Straight-line distance from the user's home: ~${locationInfo.distanceMiles} miles (driving distance will be longer)`
          );
        }
        lines.push(
          dedent(`
            REMINDER: if this job requires any on-site presence and the user's preferences name specific acceptable on-site cities/areas, this job's city must be one of them; if it isn't, that's a location mismatch (fitScore capped at 0.5) REGARDLESS of how small the distance is.
          `)
        );
      }
      userContent += '\n\n' + lines.join('\n');
    }

    const [response] = await this.llm.chat(
      config.model,
      [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userContent },
      ],
      'json'
    );
    return response as Promise<JobFitResponse>;
  }

  /**
   * Resolves a job's listed location to the single normalized location
   * closest to the user (via a small LLM prompt), then geocodes it to
   * compute the real distance from the user's home
   */
  async resolveJobLocation(job: ListedJob): Promise<JobLocationInfo> {
    const { config } = this.settings;
    const sysPrompt = [
      Analyzer.prompts.resolveJobLocation,
      this.userLocationPrompt,
    ].join('\n\n');

    const [response] = await this.llm.chat(config.model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: job.location },
    ]);

    const location = (response as string)
      .trim()
      .replace(/^["'`]+|["'`.]+$/g, '');
    const isRemote = /^remote\b/i.test(location);
    const isUnknown = /^unknown\b/i.test(location);

    let distanceMiles: number | null = null;
    if (!isRemote && !isUnknown) {
      this.userPlacePromise ??= this.geocodeUserLocation();
      const [userPlace, jobPlace] = await Promise.all([
        this.userPlacePromise,
        geocode(location).catch(() => null),
      ]);

      if (userPlace && jobPlace) {
        distanceMiles = Math.max(
          1,
          Math.round(haversineMiles(userPlace, jobPlace))
        );
      }
    }

    return { location, isRemote, distanceMiles };
  }

  /**
   * Geocode the user's location from their geo info's place names
   * (rather than trusting its lat/lon, which the user may want to
   * override, e.g. when on a VPN or planning to move)
   */
  private geocodeUserLocation(): Promise<GeocodedPlace | null> {
    const { geo } = this.settings.userInfo;
    return geocode(`${geo.city}, ${geo.region}, ${geo.country}`).catch(
      () => null
    );
  }

  async jobIsPotentialFit(job: ListedJob): Promise<boolean> {
    const { config } = this.settings;
    const sysPrompt = [
      Analyzer.prompts.potentialJobFit,
      this.userInfoPrompt,
      this.userResumeSummaryPrompt,
    ].join('\n\n');

    const [response, convoId] = await this.llm
      .chat(config.model, [
        { role: 'system', content: sysPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            title: job.title,
            location: job.location,
          }),
        },
      ])
      .then(([res, id]) => [res.trim(), id]);

    let shouldKeepJob: boolean;
    const boolMatchRx = /^(true|false)/;
    const [, shouldKeepJobStr] = response.match(boolMatchRx) || [];
    if (shouldKeepJobStr) {
      shouldKeepJob = shouldKeepJobStr === 'true';
    } else {
      const error = new Error(`Model didn't respond with a boolean`);
      // @ts-expect-error
      error.convoId = convoId;
      throw error;
    }

    return shouldKeepJob;
  }

  private generateUserPrompts({
    resume,
    resumeSummary,
    jobPrefs,
    geo,
  }: UserInfo): [
    infoPrompt: string,
    locationPrompt: string,
    resumePrompt: string,
    resumeSummaryPrompt: string,
  ] {
    const locationPrompt = dedent(`
      # User location
      Country: ${geo.country}
      Region: ${geo.region}
      City: ${geo.city}
    `);

    let infoPrompt = dedent(`
      # User information

      ## Location
      Country: ${geo.country}
      Region: ${geo.region}
      City: ${geo.city}
    `);

    infoPrompt += `\n\n## User Job preferences (**IMPORTANT**)\n`;
    infoPrompt += `\`\`\`\`md\n`;
    infoPrompt += jobPrefs;
    infoPrompt += `\n\`\`\`\``;

    let resumePrompt = `\n\n## User Resume\n`;
    resumePrompt += `\`\`\`\`md\n`;
    resumePrompt += resume;
    resumePrompt += `\n\`\`\`\``;

    let resumeSummaryPrompt = `\n\n## User work experience summary\n`;
    resumeSummaryPrompt += `\`\`\`\`md\n`;
    resumeSummaryPrompt += resumeSummary;
    resumeSummaryPrompt += `\n\`\`\`\``;

    return [infoPrompt, locationPrompt, resumePrompt, resumeSummaryPrompt];
  }
}
