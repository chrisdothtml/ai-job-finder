import fs from 'node:fs/promises';
import path from 'node:path';
import { companies } from '../.generated/company-listings.ts';
import { Analyzer, type JobFitResponse } from '../Analyzer.ts';
import { convosDir, dataDir, publicDir, repoRootDir } from '../constants.ts';
import { type ListedJob } from '../scraping/Scraper.ts';
import { Spinner } from '../utils.ts';

export type AnalyzedJob = ListedJob &
  JobFitResponse & {
    companyName: string;
  };

async function main() {
  const rawOutputFilePath = path.join(dataDir, 'analysis-raw.json');

  const analyzer = new Analyzer();
  await analyzer.init();

  const companyEntries = Object.entries(companies);
  console.log(`Analyzing jobs from ${companyEntries.length} companies`);

  const analyzedJobs: AnalyzedJob[] = [];
  const errors: Error[] = [];
  let _errors: Error[];
  for (const [slug, company] of companyEntries) {
    const logTag = `[${company.name}] `;
    using scraper = new company.Scraper(slug);

    let spinner = new Spinner(logTag + `Fetching job listings...`).start();
    const jobs = await scraper.getJobsList();
    spinner.succeed(logTag + `Fetched ${jobs.length} jobs`);

    spinner = new Spinner(
      logTag + `Reducing jobs based on user info...`
    ).start();
    let filteredJobs: ListedJob[];
    [filteredJobs, _errors] = await analyzer.reduceJobList(jobs);
    errors.push(..._errors);
    spinner.succeed(
      logTag + `Reduced list to ${filteredJobs.length} potential matches`
    );

    spinner = new Spinner(logTag + `Fetching details for jobs...`, {
      clearAfter: true,
    }).start();
    const jobsList = await Promise.all(
      filteredJobs.map(async (job) => {
        try {
          const content = await scraper.getJobContent(job.id);
          return { ...job, content };
        } catch (error) {
          errors.push(error as Error);
          return null;
        }
      })
    ).then((l) => l.filter((j) => j !== null));
    spinner.succeed();

    spinner = new Spinner('').start();
    const jobsListLen = jobsList.length;
    for (let i = 0; i < jobsListLen; i++) {
      spinner.text =
        logTag + `Generating fitness info for jobs ${i + 1}/${jobsListLen}`;

      const job = jobsList[i];
      try {
        const analysis = await analyzer.analyzeJob(job.content);
        // @ts-expect-error
        delete job.content;
        analyzedJobs.push({ ...job, ...analysis, companyName: company.name });
        await fs.writeFile(
          rawOutputFilePath,
          JSON.stringify(analyzedJobs, null, 2)
        );
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }
    spinner.succeed(logTag + `Analyzed ${jobsListLen} jobs`);
  }

  for (const error of errors) {
    // @ts-expect-error
    if (error.convoId) {
      // @ts-expect-error
      error.convoPath =
        './' +
        path.relative(
          repoRootDir,
          // @ts-expect-error
          path.join(convosDir, `${error.convoId}.json`)
        );
    }
    console.error(error);
  }
  console.log('');

  const outputFilePath = path.join(publicDir, 'jobs.json');
  const relOutputFilePath = path.relative(repoRootDir, outputFilePath);
  const finalJobsList = analyzedJobs
    .filter((j) => j.fitScore > 0.6)
    .sort((a, b) => {
      // 1. sort by fitness score
      const scoreDiff = b.fitScore - a.fitScore;
      if (scoreDiff !== 0) return scoreDiff;

      // 2. sort by company name
      const companyDiff = a.companyName.localeCompare(b.companyName);
      if (companyDiff !== 0) return companyDiff;

      // 3. sort by id
      return a.id.localeCompare(b.id);
    });

  await fs.writeFile(outputFilePath, JSON.stringify(finalJobsList, null, 2));
  console.log(
    `Dumped ${finalJobsList.length} potential jobs into ./${relOutputFilePath}`
  );
}

await main();
