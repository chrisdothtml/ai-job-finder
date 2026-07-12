import React, { useEffect, useRef, useState } from 'react';
import {
  AnalysisStateStatus,
  type AnalysisState,
  type AnalyzerSettings,
} from '../../analysis/types.ts';
import { postApi } from '../api.ts';
import './AnalysisPanel.css';

const STATUS_LABELS: Record<AnalysisStateStatus, string> = {
  [AnalysisStateStatus.Idle]: 'Idle',
  [AnalysisStateStatus.Running]: 'Running',
  [AnalysisStateStatus.Complete]: 'Complete',
  [AnalysisStateStatus.Aborted]: 'Aborted',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([]);
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

/**
 * Collapsible widget above the jobs list for driving analysis runs:
 * start/abort, live progress, and the run's message stream (fed by the
 * `/api/analysis/events` SSE endpoint)
 */
export function AnalysisPanel({
  settings,
  hasJobs,
  onOpenSettings,
  reloadJobs,
}: {
  settings: AnalyzerSettings;
  hasJobs: boolean;
  onOpenSettings: () => void;
  reloadJobs: () => void;
}) {
  const [state, setState] = useState<AnalysisState | null>(null);
  const [open, setOpen] = useState(false);
  const prevStatusRef = useRef<AnalysisStateStatus | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const status = state?.status ?? AnalysisStateStatus.Idle;
  const running = status === AnalysisStateStatus.Running;
  const percent =
    status === AnalysisStateStatus.Complete
      ? 100
      : Math.min(100, Math.round((state?.percent ?? 0) * 100));

  useEffect(() => {
    const es = new EventSource('api/analysis/events');
    es.onmessage = (e) => setState(JSON.parse(e.data) as AnalysisState);
    return () => es.close();
  }, []);

  // auto-expand when a run starts, and refresh the jobs list when one
  // finishes (a null prev status means we just loaded the page mid-state,
  // not that a run transitioned)
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (running && prev !== null && prev !== status) setOpen(true);
    if (prev === AnalysisStateStatus.Running && !running) reloadJobs();
  }, [status]);

  async function clearJobs() {
    if (!confirm('Clear all analyzed jobs? This deletes the jobs file.'))
      return;
    await postApi('api/jobs/clear', {});
    reloadJobs();
  }

  // keep the newest message in view
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state?.messages.length, open]);

  return (
    <section className="analysis-panel">
      <div
        className="ap-header no-select"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.ap-actions')) return;
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}>
        <svg
          className={`chevron ${open ? 'open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="ap-title">Analysis</span>
        <span className={`ap-status ap-status-${status.toLowerCase()}`}>
          {STATUS_LABELS[status]}
          {running && ` · ${percent}%`}
        </span>

        <div className="ap-actions">
          {running ? (
            <button
              className="ap-btn ap-btn-abort"
              onClick={() => postApi('api/analysis/abort', {})}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Abort
            </button>
          ) : (
            <button
              className="ap-btn ap-btn-run"
              disabled={state === null}
              onClick={() => postApi('api/analysis/start', { settings })}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v13.72c0 .81.87 1.31 1.57.9l11.05-6.86a1.05 1.05 0 0 0 0-1.8L9.57 4.24A1.05 1.05 0 0 0 8 5.14z" />
              </svg>
              Run analysis
            </button>
          )}
          <button
            className="settings-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="settings-btn-label">Settings</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="ap-body">
          {status === AnalysisStateStatus.Idle ? (
            <p className="ap-hint">
              Run an analysis to fetch job listings from your selected companies
              and score them against your profile.
            </p>
          ) : (
            <>
              <div className="ap-progress">
                <div className="ap-progress-track">
                  <div
                    className={`ap-progress-fill ${running ? '' : status.toLowerCase()}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="ap-progress-pct">{percent}%</span>
              </div>

              <div className="ap-meta">
                {running && state!.startTs > 0 && (
                  <span>Started at {formatTime(state!.startTs)}</span>
                )}
                {!running && state!.finishTs > 0 && (
                  <span>
                    {STATUS_LABELS[status]} in{' '}
                    {formatDuration(state!.finishTs - state!.startTs)}
                  </span>
                )}
                {state!.errors.length > 0 && (
                  <span className="ap-meta-errors">
                    {state!.errors.length}{' '}
                    {state!.errors.length === 1 ? 'error' : 'errors'} (see
                    server logs)
                  </span>
                )}
              </div>

              {state!.messages.length > 0 && (
                <div className="ap-log" ref={logRef}>
                  {state!.messages.map((m, i) => (
                    <div key={i} className="ap-log-line">
                      <span className="ap-log-ts">{formatTime(m.ts)}</span>
                      <span className="ap-log-text">{m.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {hasJobs && (
            <div className="ap-jobs-actions">
              <a className="ap-link" href="api/jobs" download="jobs.json">
                Download jobs
              </a>
              {/* a running analysis would immediately rewrite the file */}
              <button
                className="ap-link"
                disabled={running}
                onClick={clearJobs}>
                Clear jobs
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
