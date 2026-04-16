import fs from 'node:fs/promises';
import path from 'node:path';
import { urlToMarkdown } from './url-to-markdown.ts';
import { dedent, getGeoLocation, ollamaChat } from './utils.ts';

const DATA_DIR = path.resolve(import.meta.dirname, '../.data');

interface JobFitResponse {
  fitScore: number;
  pros: string;
  cons: string;
}
const JobFitResponseStr = `
interface JobFitResponse {
  fitScore: number;
  pros: string;
  cons: string;
}
`
  .replaceAll('  ', '')
  .replace(/\n/g, ' ')
  .trim();

async function generateSysPrompt(resume: string, prefs: string) {
  const geo = await getGeoLocation();

  let result = dedent(`
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
    The user is trusting you to process their info and the info of a job from their persective. Imagine you are the user and use that to determine whether you would want to do the job they provide. Be strict with your fitness score, don't try to imagine a scenario where a job might be a fit for them. If it's not a fit, it's not a fit; and your fitness score should reflect that.

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

async function main() {
  const [resume, prefs] = await Promise.all([
    fs.readFile(path.join(DATA_DIR, 'resume.md'), 'utf-8'),
    fs.readFile(path.join(DATA_DIR, 'job-preferences.md'), 'utf-8'),
  ]);
  const { markdown: job } = await urlToMarkdown(
    'https://job-boards.greenhouse.io/anthropic/jobs/4741102008'
  );

  console.log(
    await ollamaChat<JobFitResponse>('gemma4:e4b', [
      { role: 'system', content: await generateSysPrompt(resume, prefs) },
      { role: 'user', content: job },
    ])
  );
}

await main();
