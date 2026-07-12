import path from 'node:path';
import { dataDir, repoRootDir } from '../constants.ts';
import { getEnv, readIfExists } from '../utils/node.ts';
import { getGeoLocation } from '../utils/shared.ts';
import { Spinner } from '../utils/Spinner.ts';
import { Analyzer } from './Analyzer.ts';
import { companies } from './companies.ts';
import { manager, ManagerEvent, managerEvents } from './manager.ts';
import { type AnalyzerSettings } from './types.ts';

await analyze(await createSettings());

async function analyze(settings: AnalyzerSettings) {
  if (!settings.userInfo.resumeSummary) {
    const spinner = new Spinner('Generating resume summary...').start();
    const analyzer = new Analyzer(settings, new AbortController().signal);

    const summary = await analyzer.generateResumeSummary();
    spinner.succeed(
      `Resume summary generated (save this to '.data/resume-summary.md' to skip this step next time)`
    );
    console.log(`Resume summary:\n${summary}\n`);
  }

  await new Promise<void>((resolve) => {
    let spinner: Spinner | null = null;
    let shownMsgCount = 0;

    managerEvents.on(ManagerEvent.State, (state) => {
      const { messages } = state;
      const running = manager.isRunning(state);

      if (messages.length > shownMsgCount) {
        const newMsgs = messages.slice(shownMsgCount);
        shownMsgCount = messages.length;

        if (spinner) {
          spinner.succeed();
          spinner = null;
        }

        for (let i = 0; i < newMsgs.length - 1; i++) {
          new Spinner(newMsgs[i].text).succeed(newMsgs[i].text);
        }

        const lastMsg = newMsgs[newMsgs.length - 1].text;
        if (running) {
          spinner = new Spinner(lastMsg).start();
        } else {
          new Spinner(lastMsg).succeed(lastMsg);
        }
      }

      if (!running) {
        if (spinner) {
          spinner.succeed();
          spinner = null;
        }
        resolve();
      }
    });

    process.once('SIGINT', () => manager.abortAnalysis());
    manager.startAnalysis(settings);
  });
}

async function createSettings(): Promise<AnalyzerSettings> {
  const resumePath = path.join(dataDir, 'resume.md');
  const resumeSummaryPath = path.join(dataDir, 'resume-summary.md');
  const jobPrefsPath = path.join(dataDir, 'job-preferences.md');
  const [{ country, regionName, city }, resume, resumeSummary, jobPrefs] =
    await Promise.all([
      getGeoLocation(),
      readIfExists(resumePath),
      readIfExists(resumeSummaryPath),
      readIfExists(jobPrefsPath),
    ]);

  if (!resume) {
    throw new Error(
      `File not found: ${path.relative(repoRootDir, resumePath)}`
    );
  }
  if (!jobPrefs) {
    throw new Error(
      `File not found: ${path.relative(repoRootDir, jobPrefsPath)}`
    );
  }

  return {
    userInfo: {
      resume,
      resumeSummary,
      jobPrefs,
      geo: { country, region: regionName, city },
    },
    config: {
      modelProvider: 'ollama',
      baseUrl: getEnv('OLLAMA_HOST', 'http://localhost:11434'),
      model: 'gpt-oss:20b',
    },
    companiesList: Object.keys(companies),
  };
}
