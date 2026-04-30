import React from 'react';
import { type AnalyzedJob } from '../analyze.ts';
import { ScoreRing } from './ScoreRing.tsx';

export function JobCard({ job, idx }: { job: AnalyzedJob; idx: number }) {
  return (
    <div className="job-card" style={{ animationDelay: `${idx * 30}ms` }}>
      <div className="card-header">
        <div className="card-meta">
          <div className="company-name">{job.companyName}</div>
          <div className="job-title">{job.title}</div>
          <div className="job-location">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {job.location}
          </div>
        </div>
        <ScoreRing score={job.fitScore} />
      </div>

      <div className="pros-cons">
        <div className="quote-block pros">
          <div className="quote-label">Pros</div>
          {job.pros}
        </div>
        <div className="quote-block cons">
          <div className="quote-label">Cons</div>
          {job.cons}
        </div>
      </div>

      <div className="card-footer">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="view-link">
          View posting
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </div>
    </div>
  );
}
