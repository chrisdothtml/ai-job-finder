/**
 * This script is a way to benchmark/compare the format and
 * quality of all the different LLM interactions across
 * different models and model providers.
 *
 * For the user data, it fetches the geo info and reads the
 * `resume.md` and `job-preferences.md` from the `.data` dir.
 *
 * For job analysis, it uses a pre-selected list of jobs with
 * known expected results for the user running it (this is
 * used to gauge the quality of an LLM's output).
 *
 * It emits markdown reports into `.data/model-comparison/reports/`
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  Analyzer,
  type JobFitResponse,
  type JobLocationInfo,
} from '../analysis/Analyzer.ts';
import { companies, getScraper } from '../analysis/companies.ts';
import { type ListedJob } from '../analysis/scraping/Scraper.ts';
import { type Config, type UserInfo } from '../analysis/types.ts';
import { dataDir } from '../constants.ts';
import {
  getEnv,
  getEnvStrict,
  isMainModule,
  readIfExists,
} from '../utils/node.ts';
import { dedent, getGeoLocation } from '../utils/shared.ts';

const modelComparisonDir = path.join(dataDir, 'model-comparison');
const cacheDir = path.join(modelComparisonDir, '.cache');
const outputDir = path.join(modelComparisonDir, 'reports');
await Promise.all([
  fs.mkdir(cacheDir, { recursive: true }),
  fs.mkdir(outputDir, { recursive: true }),
]);

if (isMainModule(import.meta)) {
  await main();
}

async function main() {
  /**
   * These are hand-picked jobs with known scores specifically
   * for me (the one running this comparison).
   *
   * These jobs likely won't exist in the future (as jobs are
   * regulary filled and taken down), so this script will cache
   * the jobs indefinitely in the `.data` dir.
   *
   * In the future, whoever's running this will need to hand-pick
   * new jobs for themselves.
   */
  const testJobs: TestJob[] = [
    { companySlug: 'affirm', id: '7749580003', note: 'great fit, remote' },
    {
      companySlug: 'anthropic',
      id: '5157847008',
      note: 'not great fit (backend heavy), location is fine',
    },
    {
      companySlug: 'replit',
      id: 'd0e0dd7d-59d1-4de8-afbb-54aea680b51d',
      note: 'good fit, bad location',
    },
    {
      companySlug: 'databricks',
      id: '7882009002',
      note: 'bad fit, good location',
    },
    {
      companySlug: 'figma',
      id: '5980571004',
      note: 'good fit overall',
    },
  ];

  const models: Config[] = [
    {
      modelProvider: 'ollama',
      baseUrl: getEnv('OLLAMA_HOST', 'http://localhost:11434'),
      model: 'gpt-oss:20b',
    },
    {
      modelProvider: 'chatgpt',
      apiKey: getEnvStrict('CHATGPT_TOKEN'),
      model: 'gpt-5.4',
    },
    {
      modelProvider: 'claude',
      apiKey: getEnvStrict('CLAUDE_TOKEN'),
      model: 'claude-sonnet-4-5',
    },
  ];

  const reportDir = path.join(outputDir, Date.now() + '');
  await fs.mkdir(reportDir, { recursive: true });

  const [resume, jobPrefs, jobs, { country, regionName, city }] =
    await Promise.all([
      readIfExists(path.join(dataDir, 'resume.md')),
      readIfExists(path.join(dataDir, 'job-preferences.md')),
      fetchTestJobs(testJobs),
      fetchGeo(),
    ]);
  const report = await generateReport({
    resume,
    jobPrefs,
    geo: { country, region: regionName, city },
    models,
    jobs,
    silent: false,
  });

  for (const entry of report) {
    const { modelProvider, model } = entry;
    const entryContent = renderReportEntry(entry);
    const entryPath = path.join(reportDir, `${modelProvider}-${model}.md`);

    await fs.writeFile(entryPath, entryContent);
  }

  const reportContent = JSON.stringify(report, null, 2);
  await Promise.all([
    fs.writeFile(path.join(reportDir, 'report.json'), reportContent),
    fs.writeFile(path.join(outputDir, 'latest-report.json'), reportContent),
  ]);
}

export type GenerateReportOpts = Omit<UserInfo, 'resumeSummary'> & {
  models: Config[];
  jobs: ResolvedTestJob[];
  silent?: boolean;
};

export async function generateReport(
  opts: GenerateReportOpts,
  abortSignal: AbortSignal = new AbortController().signal
): Promise<Report> {
  const { resume, jobPrefs, geo } = opts;
  const runSilently = opts.silent ?? true;
  const userInfo: UserInfo = {
    resume,
    resumeSummary: '',
    jobPrefs,
    geo,
  };

  const report: ReportEntry[] = [];
  for (const config of opts.models) {
    const { modelProvider, model } = config;
    if (!runSilently) {
      console.error(`[${modelProvider} model '${model}']`);
    }

    const analyzer = new Analyzer(
      { userInfo, config, companiesList: [] },
      abortSignal
    );
    await analyzer.preloadModel();

    const [summary, summaryDur, summaryErr] = await timedTask(
      `Generating resume summary`,
      () => analyzer.generateResumeSummary(),
      runSilently
    );

    const reportJobs: ReportJob[] = [];
    for (const job of opts.jobs) {
      const [potFit, potFitDur, potFitErr] = await timedTask(
        `Generating potential job fit`,
        () => analyzer.jobIsPotentialFit(job),
        runSilently
      );

      const [locationInfo, locationDur, locationErr] = await timedTask(
        `Resolving job location`,
        () => analyzer.resolveJobLocation(job),
        runSilently
      );

      const [analysis, analysisDur, analysisErr] = await timedTask(
        `Generating job analysis`,
        () => analyzer.analyzeJob(job.content, locationInfo),
        runSilently
      );

      reportJobs.push({
        companySlug: job.companySlug,
        id: job.id,
        note: job.note,
        listedLocation: job.location,
        potentialFit: {
          durationMs: potFitDur,
          result: potFit,
          error: potFitErr,
        },
        location: {
          durationMs: locationDur,
          result: locationInfo,
          error: locationErr,
        },
        analysis: {
          durationMs: analysisDur,
          result: analysis,
          error: analysisErr,
        },
      });
    }

    await analyzer.unloadModel();

    report.push({
      modelProvider,
      model,
      resumeSummary: {
        durationMs: summaryDur,
        result: summary,
        error: summaryErr,
      },
      jobs: reportJobs,
    });
  }

  return report;
}

/**
 * This renders markdown text for a report entry. The goal
 * for these files is for them to be easily comparable with
 * other model report entries visualy side-by-side.
 */
function renderReportEntry(entry: ReportEntry): string {
  const { modelProvider, model, resumeSummary, jobs } = entry;
  return [
    `# ${model} (${modelProvider})`,
    dedent(`
      ## Resume summary (${formatMsDuration(resumeSummary.durationMs)})
      \`\`\`
      ${resumeSummary.error ?? resumeSummary.result}
      \`\`\`
    `),
    `## Jobs`,
    jobs
      .map((job) => {
        const { potentialFit, analysis } = job;
        const json: any = JSON.parse(JSON.stringify(job));

        // make durations readable
        json.potentialFit.duration = formatMsDuration(potentialFit.durationMs);
        delete json.potentialFit.durationMs;
        json.location.duration = formatMsDuration(job.location.durationMs);
        delete json.location.durationMs;
        json.analysis.duration = formatMsDuration(analysis.durationMs);
        delete json.analysis.durationMs;

        return [
          `### ${job.companySlug} (${job.id})`,
          `> ${job.note}\n`,
          '```json',
          JSON.stringify(json, null, 2),
          '```',
        ].join('\n');
      })
      .join('\n\n'),
  ].join('\n\n');
}

async function timedTask<R>(
  label: string,
  task: () => Promise<R>,
  runSilently: boolean
): Promise<[result: R | null, duration: number, error: string | null]> {
  if (!runSilently) {
    process.stderr.write(`${label}...`);
  }
  const startMs = Date.now();

  let duration: number;
  try {
    const result = await task();
    duration = Date.now() - startMs;

    if (!runSilently) {
      process.stderr.write(` (${formatMsDuration(duration)})\n`);
    }

    return [result, duration, null];
  } catch (error) {
    duration = Date.now() - startMs;
    const errorStr = 'ERROR: ' + (error as Error).stack!;

    if (!runSilently) {
      process.stderr.write(` (${formatMsDuration(duration)})\n`);
      process.stderr.write(errorStr + '\n');
    }

    return [null, duration, errorStr];
  }
}

async function fetchTestJobs(jobs: TestJob[]): Promise<ResolvedTestJob[]> {
  const result: ResolvedTestJob[] = [];
  for (const job of jobs) {
    const { companySlug, id } = job;

    const cacheKey = crypto
      .createHash('sha256')
      .update(JSON.stringify({ companySlug, id }))
      .digest('hex');
    const cacheFilePath = path.join(cacheDir, `${cacheKey}.json`);
    const cachedJob = await readIfExists(cacheFilePath);
    if (cachedJob) {
      result.push(JSON.parse(cachedJob));
      continue;
    }

    const company = companies[companySlug];
    const Scraper = await getScraper(company.scraper);
    const scraper = new Scraper(companySlug);

    const companyJobs = await scraper.getJobsList();
    const targetJob = companyJobs.find((j) => j.id === id);
    if (!targetJob) {
      const error = new Error(`Unable to find job (doesn't exist)`);
      // @ts-expect-error
      error.job = job;
      throw error;
    }

    const resolvedJob: ResolvedTestJob = {
      ...job,
      ...targetJob,
      content: await scraper.getJobContent(job.id),
    };

    await fs.writeFile(cacheFilePath, JSON.stringify(resolvedJob));
    result.push(resolvedJob);
  }

  return result;
}

async function fetchGeo() {
  const cacheFilePath = path.join(cacheDir, `geo.json`);
  const cachedGeo = await readIfExists(cacheFilePath);
  if (cachedGeo) return JSON.parse(cachedGeo);

  const geo = await getGeoLocation();
  await fs.writeFile(cacheFilePath, JSON.stringify(geo));
  return geo;
}

function formatMsDuration(totalMs: number) {
  const totalSeconds = totalMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${Number(seconds.toFixed(1))}s`);

  return parts.join(' ');
}

interface TestJob {
  companySlug: string;
  id: string;
  note: string;
}

type ResolvedTestJob = TestJob &
  ListedJob & {
    content: string;
  };

type ReportJob = TestJob & {
  /** the raw location string from the job listing */
  listedLocation: string;
  potentialFit: {
    durationMs: number;
    result: boolean | null;
    error: string | null;
  };
  location: {
    durationMs: number;
    result: JobLocationInfo | null;
    error: string | null;
  };
  analysis: {
    durationMs: number;
    result: JobFitResponse | null;
    error: string | null;
  };
};

type ReportEntry = Omit<Config, 'baseUrl' | 'apiKey'> & {
  resumeSummary: {
    durationMs: number;
    result: string | null;
    error: string | null;
  };
  jobs: ReportJob[];
};

type Report = ReportEntry[];
