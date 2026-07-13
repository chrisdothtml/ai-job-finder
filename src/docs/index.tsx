import React from 'react';
import ReactDOM from 'react-dom/client';
import { JobCard } from '../ui/Jobs/JobCard.tsx';
import { Logo } from '../ui/Jobs/Logo.tsx';
import './index.css';
import { MOCK_JOBS } from './mocks.ts';

// in the docs dev server, we render the app on the page, but in the
// production build, it's SSR'd so is treated differently
if (__DEV__) {
  // `?screenshot` renders just the app preview, styled for capture
  // by screenshot-app.ts
  const isScreenshotMode = new URLSearchParams(location.search).has(
    'screenshot'
  );
  if (isScreenshotMode) {
    document.documentElement.classList.add('screenshot-mode');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    isScreenshotMode ? <AppPreview /> : <Docs />
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * A non-interactive replica of the app's toolbar + job grid, framed in
 * a web browser. Re-uses the real app components/CSS so it never drifts
 * out of date
 */
function AppPreview() {
  return (
    <div className="docs-frame-wrap">
      <div className="docs-frame no-select" aria-hidden="true">
        <div className="docs-frame-chrome">
          <span className="docs-frame-dot" />
          <span className="docs-frame-dot" />
          <span className="docs-frame-dot" />
          <span className="docs-frame-url">localhost:8000</span>
        </div>

        <header className="toolbar">
          <div className="toolbar-inner">
            <Logo className="header-logo" />
            <span className="wordmark">JobFinder</span>
            <div className="divider" />
            <div className="search-wrap">
              <SearchIcon className="search-icon" />
              <input
                className="search-input no-pointer-events"
                type="text"
                placeholder="Search jobs…"
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="toolbar-filters">
              <div className="score-filter">
                <label>Match</label>
                <input
                  className="score-slider no-pointer-events"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  defaultValue={0.6}
                  tabIndex={-1}
                />
                <span className="score-val">≥60%</span>
              </div>
              <span className="result-count hidden-mobile">4 of 218 jobs</span>
              <span className="result-count hidden-desktop">2 of 218 jobs</span>
            </div>
          </div>
        </header>

        <div className="main">
          <div className="job-grid">
            {MOCK_JOBS.map(({ job, company }, idx) => (
              <JobCard
                className={idx > 1 ? 'hidden-mobile' : ''}
                key={job.id}
                job={{ ...job, url: __REPO_URL__ }}
                idx={idx}
                company={company}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: 'Scrape',
    body: "Scrapers pull every open role straight from each company's job board API; no headless-browser flakiness, no manually paging through careers sites.",
  },
  {
    title: 'Filter',
    body: "A filtering agent skims the full list of titles and locations and drops anything that's clearly not a fit, so the expensive analysis only runs on real candidates.",
  },
  {
    title: 'Analyze',
    body: 'An analysis agent reads each remaining posting against your resume and preferences, scoring the fit and writing out the trade-offs.',
  },
  {
    title: 'Review',
    body: 'Jobs land in a searchable, filterable list with a match score and pros/cons on every card. You only read the ones worth reading.',
  },
];

export function Docs() {
  return (
    <>
      <div className="docs-wash">
        <nav className="docs-nav">
          <div className="docs-nav-inner">
            <Logo className="header-logo" />
            <span className="wordmark">JobFinder</span>
            <div className="docs-nav-links">
              <a href="#how-it-works">How it works</a>
              <a href="#providers">LLM providers</a>
              <a href="#get-started">Get started</a>
            </div>
            <a
              className="docs-btn primary small ml-auto"
              href={__REPO_URL__}
              target="_blank"
              rel="noopener noreferrer">
              <GitHubIcon className="docs-btn-icon" />
              GitHub
            </a>
          </div>
        </nav>

        <section className="docs-hero">
          <h1>Let AI read the careers pages for you</h1>
          <p>
            JobFinder scrapes companies' job boards, filters out the noise with
            an LLM, and hands you a scored shortlist with pros and cons, so you
            can spend your time doing literally anything else.
          </p>
          <div className="docs-hero-ctas">
            <a className="docs-btn primary" href="#get-started">
              Get started
            </a>
            <a
              className="docs-btn secondary"
              href={__REPO_URL__}
              target="_blank"
              rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
        </section>

        <AppPreview />
      </div>

      <section className="docs-section" id="how-it-works">
        <h2>How it works</h2>
        <p className="docs-section-sub">
          An agentic pipeline that turns hundreds of postings across every
          company you care about into a short, scored list.
        </p>
        <div className="docs-steps">
          {STEPS.map((step, i) => (
            <div className="docs-step" key={step.title}>
              <span className="docs-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="docs-section" id="providers">
        <h2>Bring your own LLM</h2>
        <p className="docs-section-sub">
          Analysis runs against whatever model you point it at: fully offline
          with Ollama, or hosted with an Anthropic or OpenAI API key.
        </p>
        <div className="docs-providers">
          <div className="docs-provider">
            <img src="./assets/ollama-icon.png" alt="" />
            <h3>
              Ollama <span className="docs-tag">Default</span>
            </h3>
            <p>
              Run everything offline on your own hardware, with zero API costs.{' '}
              <code>gpt-oss:20b</code> on a single RTX 4090 comfortably chews
              through a full overnight run of every company.
            </p>
            <a
              href="https://ollama.com/"
              target="_blank"
              rel="noopener noreferrer">
              ollama.com
            </a>
          </div>
          <div className="docs-provider">
            <img src="./assets/claude-icon.png" alt="" />
            <h3>Claude</h3>
            <p>
              Anthropic's models. Paste in an API key during onboarding and pick
              any model your key has access to. API keys never leave your
              machine unencrypted.
            </p>
            <a
              href="https://platform.claude.com/"
              target="_blank"
              rel="noopener noreferrer">
              platform.claude.com
            </a>
          </div>
          <div className="docs-provider">
            <img src="./assets/chatgpt-icon.png" alt="" />
            <h3>ChatGPT</h3>
            <p>
              OpenAI's models, and the origin of the <code>gpt-oss</code> family
              that works so well offline. Works the same way: one key, any
              model.
            </p>
            <a
              href="https://platform.openai.com/"
              target="_blank"
              rel="noopener noreferrer">
              platform.openai.com
            </a>
          </div>
        </div>
        <div className="docs-note">
          <strong>Model variance:</strong> every model calibrates its scores a
          little differently; some are stingy, some inflate. A deeper guide
          comparing providers and models on the same job set may be released in
          the future.
        </div>
      </section>

      <section className="docs-section" id="get-started">
        <h2>Get started</h2>
        <p className="docs-section-sub">
          Clone it, start it, and walk through onboarding in your browser: pick
          your companies, your model, and paste in your resume. Then kick off a
          run and come back to a scored list.
        </p>
        <pre className="docs-code">
          <span className="c"># grab the code</span>
          {'\n'}git clone {__REPO_URL__}.git{'\n'}cd ai-job-finder{'\n\n'}
          <span className="c">
            # install deps (Volta auto-picks the right node + yarn)
          </span>
          {'\n'}yarn install{'\n\n'}
          <span className="c"># build the UI &amp; start the server</span>
          {'\n'}yarn app:build &amp;&amp; yarn app:start
        </pre>
      </section>

      <footer className="docs-footer">
        <GitHubIcon className="github-logo" />
        <span>
          <a href={__REPO_URL__} target="_blank" rel="noopener noreferrer">
            chrisdothtml/ai-job-finder
          </a>{' '}
          &mdash;{' '}
          <a
            href={`${__REPO_URL__}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer">
            MIT License
          </a>
        </span>
      </footer>
    </>
  );
}
