import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { convosDir, jobsFile } from '../constants.ts';
import { Analyzer, type JobFitResponse } from './Analyzer.ts';
import { companies, getScraper } from './companies.ts';
import { type ListedJob } from './scraping/Scraper.ts';
import {
  AnalysisStateStatus,
  type AnalysisState,
  type AnalyzerSettings,
} from './types.ts';

export type AnalyzedJob = ListedJob &
  JobFitResponse & {
    companyName: string;
    /** normalized closest location, e.g. "Foster City, California, US" or "Remote, US" */
    resolvedLocation?: string;
    /** straight-line miles from the user's home; null when remote/unknown */
    distanceMiles?: number | null;
  };

export enum ManagerEvent {
  State = 'STATE',
}
export type ManagerEventMap = {
  [ManagerEvent.State]: AnalysisState;
};
export const managerEvents = new EventEmitter<{
  [E in keyof ManagerEventMap]: [
    ...(ManagerEventMap[E] extends void ? [] : [ManagerEventMap[E]]),
  ];
}>();

/**
 * The weighted percentages of each state in the analysis,
 * roughly based on how much relative time they take during
 * the total analysis of a company's jobs
 */
const pctAdds = {
  fetchJobs: 0.01,
  reduceJobs: 0.73,
  fetchJobInfo: 0.03,
  genFitness: 0.23,
};

export class Manager {
  public state: AnalysisState = {
    status: AnalysisStateStatus.Idle,
    percent: 0,
    messages: [],
    errors: [],
    startTs: -1,
    finishTs: -1,
  };

  public isRunning(state = this.state) {
    return state.status === AnalysisStateStatus.Running;
  }

  /** {@linkcode AbortController} for the current running analysis */
  private ac: AbortController | null = null;

  startAnalysis(settings: AnalyzerSettings) {
    if (this.isRunning()) return;
    // created synchronously with the isRunning check, so an abort can never
    // land in the window before the async analyze body assigns it
    this.ac = new AbortController();
    const { signal } = this.ac;
    this.analyze(settings, signal).catch((e) => {
      // an aborted run exits by throwing (from whichever abort check it hits
      // first); the state was already finalized by `abortAnalysis`
      if (signal.aborted) return;

      // for all other unhandled exceptions, force an abort
      const error = e as Error;
      this.addError(error);
      this.abortAnalysis('Unhandled exception');
    });
  }

  abortAnalysis(reason?: any) {
    if (!this.isRunning()) return;
    this.ac!.abort(reason);
    this.ac = null;

    let abortMsg = `Run was aborted`;
    const reasonStr =
      typeof reason === 'string'
        ? reason
        : reason instanceof Error && reason.message
          ? reason.message
          : null;
    if (reasonStr != null) {
      abortMsg += ` (${reasonStr})`;
    }

    this.addMessage(abortMsg, {
      status: AnalysisStateStatus.Aborted,
      finishTs: Date.now(),
    });
  }

  /**
   * Merges the partial state object into the current state
   * and emits the new state to the {@linkcode events} channel
   */
  private updateState(state: Partial<AnalysisState>) {
    Object.assign(this.state, state);
    managerEvents.emit(ManagerEvent.State, this.state);
  }

  /**
   * Update the state to increase the progress percent by the provided
   * amount
   */
  private increasePercent(amount: number) {
    this.updateState({
      percent: this.state.percent + amount,
    });
  }

  /**
   * Add a message to the state messages array, optionally
   * with additional state updates to be passed into {@linkcode Manager.updateState}
   */
  private addMessage(message: string, state?: Partial<AnalysisState>) {
    this.updateState({
      ...state,
      messages: this.state.messages.concat({ ts: Date.now(), text: message }),
    });
  }

  /**
   * Record a non-fatal error: logged to the server console (the only place
   * errors are surfaced for now) and kept in state for the post-run analysis
   */
  private addError(e: unknown) {
    const error = e as Error;
    console.error(error);
    this.state.errors.push(error.stack ?? String(e));
  }

  private async analyze(settings: AnalyzerSettings, signal: AbortSignal) {
    const { companiesList } = settings;
    companiesList.sort((a, b) => a.localeCompare(b));

    // convos dir is just for analyzing the convos of the past run
    await fs.rm(convosDir, { recursive: true, force: true });
    await fs.mkdir(convosDir, { recursive: true });

    this.updateState({
      status: AnalysisStateStatus.Running,
      percent: 0,
      messages: [
        {
          ts: Date.now(),
          text: `Preparing to analyze jobs from ${companiesList.length} companies`,
        },
      ],
      errors: [],
      startTs: Date.now(),
      finishTs: -1,
    });

    const analyzer = new Analyzer(settings, signal);

    // preload analysis model into memory
    await analyzer.preloadModel();

    const analyzedJobs: AnalyzedJob[] = [];
    const numCompanies = companiesList.length;
    for (let i = 0; i < numCompanies; i++) {
      // abort exits by throwing (here at the loop boundaries, and from the
      // catch blocks below for in-flight work); `startAnalysis` swallows the
      // throw since `abortAnalysis` already finalized the state
      signal.throwIfAborted();

      const slug = companiesList[i];
      const company = companies[slug];
      const logTag = `[${company.name}] `;
      const Scraper = await getScraper(company.scraper);
      using scraper = new Scraper(slug);

      this.addMessage(logTag + `Fetching job listings`);
      let jobs: ListedJob[] = [];
      try {
        jobs = await scraper.getJobsList();
      } catch (error) {
        signal.throwIfAborted();
        this.addError(error);
        this.addMessage(logTag + `Failed to fetch job listings`);
        continue;
      } finally {
        this.increasePercent(pctAdds.fetchJobs / numCompanies);
      }

      this.addMessage(
        logTag +
          `Filtering list of ${jobs.length} jobs based on potential user match`
      );
      const jobsLen = jobs.length;
      const filteredJobs: ListedJob[] = [];
      for (const job of jobs) {
        const shouldKeepJob = await analyzer
          .jobIsPotentialFit(job)
          .catch((error) => {
            signal.throwIfAborted();
            this.addError(error);
            // keep the job if it failed, just in case
            return true;
          });

        this.increasePercent(pctAdds.reduceJobs / jobsLen / numCompanies);
        if (shouldKeepJob) filteredJobs.push(job);
      }

      this.addMessage(
        logTag + `Fetching details for ${filteredJobs.length} jobs`
      );
      const jobsList = await Promise.all(
        filteredJobs.map(async (job) => {
          try {
            const content = await scraper.getJobContent(job.id);
            return { ...job, content };
          } catch (error) {
            signal.throwIfAborted();
            this.addError(error);
            return null;
          }
        })
      ).then((l) => l.filter((j) => j !== null));
      this.increasePercent(pctAdds.fetchJobInfo / numCompanies);

      this.addMessage(logTag + `Generating fitness info for jobs`);
      const jobsListLen = jobsList.length;
      for (let i = 0; i < jobsListLen; i++) {
        const job = jobsList[i];
        try {
          // a failed location resolution shouldn't sink the analysis; it
          // just runs without the pre-computed location/distance info
          const locationInfo = await analyzer
            .resolveJobLocation(job)
            .catch((error) => {
              signal.throwIfAborted();
              this.addError(error);
              return null;
            });

          const analysis = await analyzer.analyzeJob(job.content, locationInfo);
          // @ts-expect-error
          delete job.content;
          analyzedJobs.push({
            ...job,
            ...analysis,
            companyName: company.name,
            ...(locationInfo && {
              resolvedLocation: locationInfo.location,
              distanceMiles: locationInfo.distanceMiles,
            }),
          });
          await fs.writeFile(jobsFile, JSON.stringify(analyzedJobs, null, 2));
        } catch (error) {
          signal.throwIfAborted();
          this.addError(error);
          continue;
        } finally {
          this.increasePercent(pctAdds.genFitness / jobsListLen / numCompanies);
        }
      }
    }

    // a late abort must not be overwritten by the Complete state below
    signal.throwIfAborted();

    await fs.writeFile(jobsFile, JSON.stringify(analyzedJobs, null, 2));
    this.updateState({
      status: AnalysisStateStatus.Complete,
      finishTs: Date.now(),
    });
  }
}

export const manager = new Manager();
