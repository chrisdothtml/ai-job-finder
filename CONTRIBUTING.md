# Contributing Guide

## Highly recommended tools

- [Volta](https://volta.sh/): auto downloads/uses node/yarn versions from package.json `volta` field
- [direnv](https://direnv.net/docs/installation.html#from-binary-builds): not strictly required, but nice for injecting binaries from [bin](./bin/) dir into `PATH`
- [vscode](https://code.visualstudio.com/):
  - I use vscode as my IDE, and have the local tooling/formatting already configured in this repo. I can't guarantee a good devXP for any other IDEs
  - Make sure you've installed the extensions from [.vscode/extensions.json](./.vscode/extensions.json) as well

## Working on the app

First make sure you've installed the dependencies:

```sh
yarn install
```

To start a local dev server, you can run:

```sh
yarn app:dev
```

Note that `yarn app:dev` auto-re-compiles after both backend and frontend changes, but you need to manually refresh your browser to see changes (this is intentional).

For a static production build, you can run:

```sh
yarn app:build && yarn app:start
```

## Other useful tooling

There are some other entrypoints which help a lot with working on this app.

**Note**: things like analyzer settings, your resume & job preferences, etc. are usually provided in the UI (and persisted in `localStorage`). When using this other local tooling, you'll need to provide these things via env vars and files in the [.data](./.data) dir instead.

See [dotenv](./dotenv) for supported environment variables. For resume and job preferences, create `.data/resume.md` and `.data/job-preferences.md` and populate them with your data (or mock data or whatever).

### Analysis CLI

```sh
yarn analyze
```

This is a way to run the full analysis without spinning up the UI. The resulting jobs file is stored in the same place as when the analysis happens from the UI (`~/.ai-job-finder/jobs.json`).

See [src/.script/analyze.ts](./src/.script/analyze.ts) for the entry point.

### LLM Model Comparison/Benchmarking

```sh
yarn compare-models
```

This allows for benchmarking and comparing outputs for all the LLM interactions in the analysis flow across different models and model providers, using a fixed set of data.

See [src/.script/compare-models.ts](./src/.script/compare-models.ts) for the entry point.

### App screenshot

```sh
yarn screenshot-app
```

This is what I use to generate the README banner image. It spins up the docs dev server, screenshots the app preview shown on the page, and updates the banner file.

## Claude skills

### `/create-scraper`

This is an extremely capable skill used for adding new company scrapers (see existing ones in [src/analysis/scraping/](./src/analysis/scraping/)). It should have all the context needed for Claude to: 1. find the correct careers page for a company, 2. build a robust scraper for its job postings (following a similar format as the other scrapers), and 3. update all the relevant parts of the codebase.

So far it has never needed to resort to creating a scraper that requires spinning up an actual web browser, and has always found a way via network requests.

Most of the scrapers in this codebase were created via this skill, so you should feel very empowered to use this skill if there's a company you want that's not already handled.

### `/find-companies`

This is kind of an old skill I used when I first started this project, when I wanted to amass a large list of companies for potentially adding new scrapers. The list of companies is now quite sizable, so I don't really use this skill; but I'm keeping it around since it has some useful info in it.
