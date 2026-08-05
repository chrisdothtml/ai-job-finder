/**
 * This script is used to collect a list of company names (that are known to
 * be hiring) via linkedin recommended jobs lists. The purpose is to find
 * companies that aren't already supported by this job finder and add
 * scrapers for them.
 *
 * Linkedin doesn't have any APIs that I'm aware of to gather this data, but
 * this little devtools script works fine.
 *
 * Usage:
 * 1. Navigate to https://www.linkedin.com/jobs/search-results/?keywords=Software%20Engineer
 *   - Note that you can change the search query if you want to find companies for other
 *     types of roles (i.e. not software engineering)
 * 2. Open the chrome devtools, paste this into the console, and hit enter
 * 3. Copy the emitted JSON array after it finishes, and save it in `.data/companies.json`
 * 4. Run `claude '/create-scraper .data/companies.json'`
 *   - I also prefer running with `--permission-mode auto`
 */
(async () => {
  /** @type {(ms: number) => Promise<void>} */
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  const jobsSelector = '[componentkey="SearchResultsMainContent"] > div';
  /** @type {() => HTMLDivElement[]} */
  const getJobsDivs = () => Array.from(document.querySelectorAll(jobsSelector));
  /** @type {(el: HTMLDivElement) => string | null} */
  const getJobCompany = (el) =>
    el.querySelectorAll('p')?.[1]?.textContent?.trim();

  const nextBtnSelector =
    '[data-testid="pagination-controls-next-button-visible"]';
  /** @type {() => HTMLButtonElement | null} */
  const getNextBtn = () => document.querySelector(nextBtnSelector);

  const start = Date.now() / 1000;
  const companies = new Set();
  while (true) {
    const current = Date.now() / 1000;
    // just a safety net to prevent infinite loop (auto-breaks after 10 seconds)
    if (current - start > 10) break;

    let jobs = getJobsDivs();
    let attempts = 0;
    while (++attempts < 20 && (jobs.length === 0 || !getJobCompany(jobs[0]))) {
      await pause(500);
      jobs = getJobsDivs();
    }

    if (jobs.length === 0) {
      console.error(
        `Unable to find jobs on the page after ${attempts} attempts`
      );
      break;
    }

    for (const el of jobs) {
      const company = getJobCompany(el);
      if (!company) break;
      companies.add(company);
    }

    const nextBtn = getNextBtn();
    if (!nextBtn) break;

    nextBtn.click();
    await pause(1000);
  }

  console.log(JSON.stringify(Array.from(companies).sort()));
})().catch(console.error);
