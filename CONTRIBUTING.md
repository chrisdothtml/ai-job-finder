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
yarn dev
```

Note that `yarn dev` auto-re-compiles after both backend and frontend changes, but you need to manually refresh your browser to see changes.

For a static production build, you can run:

```sh
yarn build && yarn start
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

See [src/analysis/analyze.ts](./src/analysis/analyze.ts) for the entry point.

### LLM Model Comparison/Benchmarking

```sh
yarn compare-models
```

This allows for benchmarking and comparing outputs for all the LLM interactions in the analysis flow across different models and model providers, using a fixed set of data.

See [src/analysis/compare-models.ts](./src/analysis/compare-models.ts) for the entry point.
