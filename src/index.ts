import { Analyzer } from './Analyzer.ts';
import { urlToMarkdown } from './url-to-markdown.ts';

async function main() {
  const analyzer = new Analyzer();
  await analyzer.init();

  const { markdown: job } = await urlToMarkdown(
    'https://job-boards.greenhouse.io/anthropic/jobs/4741102008'
  );
  console.log(await analyzer.analyzeJob(job));

  // console.log(await analyzer.reduceJobList(jobListings));
}

await main();
