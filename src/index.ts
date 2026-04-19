import { companies } from './.generated/company-listings.ts';
import { Analyzer, type JobFitResponse } from './Analyzer.ts';
import { GreenhouseScraper } from './scraping/GreenhouseScraper.ts';
import { type ListedJob } from './scraping/Scraper.ts';
import { Spinner } from './utils.ts';

async function main() {
  const errors: Error[] = [];
  let _errors: Error[];

  const analyzer = new Analyzer();
  await analyzer.init();

  const company = companies.find((c) => c.name === 'Cloudflare');
  const scraper = new GreenhouseScraper(company!.slug);

  let spinner = new Spinner('Fetching job listings...').start();
  const jobs = await scraper.getJobsList();
  spinner.succeed(`Fetched ${jobs.length} jobs`);

  spinner = new Spinner('Reducing jobs based on user info...').start();
  let filteredJobs: ListedJob[];
  [filteredJobs, _errors] = await analyzer.reduceJobList(jobs);
  errors.push(..._errors);
  spinner.succeed(`Reduced list to ${filteredJobs.length} potential matches`);

  spinner = new Spinner('Fetching details for jobs...', {
    clearAfter: true,
  }).start();
  const jobsList = await Promise.all(
    filteredJobs.slice(0, 5).map(async (job) => scraper.getJobContent(job.id))
  );
  const jobsListLen = jobsList.length;
  spinner.succeed();

  spinner = new Spinner('').start();
  const analysis: (JobFitResponse & { url: string })[] = [];
  for (let i = 0; i < jobsListLen; i++) {
    spinner.text = `Generating fitness info for jobs ${i + 1}/${jobsListLen}`;
    const result = await analyzer.analyzeJob(jobsList[i]);
    const job = JSON.parse(jobsList[i]);
    analysis.push({ ...result, url: job.absolute_url });
  }
  spinner.succeed(`Analyzed ${jobsListLen} jobs`);

  for (const error of errors) {
    console.error(error);
  }
  console.log('');

  console.log(JSON.stringify(analysis, null, 2));
}

await main();
