---
name: tech-jobs
description: Uses a public resource to retrieve a list of the current top tech companies, and detects whether they have listings on job boards with public APIs
---

You can fetch `https://companiesmarketcap.com/tech/largest-tech-companies-by-market-cap` to get an HTML document, which you'll need to reason about. The document **should** contain a table containing rows with info about tech companies. Your job is to find this list of companies and extract them into a list of just the company names. You should see a pagination link (e.g. "Next") below the list of jobs. Get the next page as well so we have a decent amount to work with.

From there, you need to figure out if they have jobs posted on commonly-used job posting sites (please do this in a single python script to avoid the user needing to confirm many commands):

- Lever: run a HEAD request to `https://jobs.lever.co/{COMPANY_NAME}` (to keep requests lightweight) to determine whether the company has jobs listed on lever
- Greenhouse: fetch `https://boards-api.greenhouse.io/v1/boards/{COMPANY_NAME}` to determine whether the company has jobs listed on Greenhouse

Then write any companies you found, along with their jobs board type to `src/.generated/company-listings.ts`. Do NOT modify the Typescript types in this file.
