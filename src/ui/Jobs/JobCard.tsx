import React, { useState } from 'react';
import { type Company } from '../../analysis/companies.ts';
import { type AnalyzedJob } from '../../analysis/manager.ts';
import { ScoreRing } from './ScoreRing.tsx';

export type CompanyInfo = Company & { slug: string };

// renders nothing if the favicon can't be fetched (e.g. the company's
// homepage changed and google has no icon for the old domain)
function CompanyFavicon({ slug }: { slug: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className="company-favicon"
      src={`/api/company-favicon/${slug}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// sticky toolbar height + max tooltip height + arrow/margin — above this
// distance from the viewport top, the tooltip fits above without sliding
// under the toolbar
const TOOLTIP_FLIP_THRESHOLD = 180;

function SummaryTip({ summary }: { summary: string }) {
  const [openBelow, setOpenBelow] = useState(false);

  // measured when the tooltip is triggered rather than on scroll, since the
  // position only matters at the moment it becomes visible
  function measure(e: React.SyntheticEvent<HTMLButtonElement>) {
    setOpenBelow(
      e.currentTarget.getBoundingClientRect().top < TOOLTIP_FLIP_THRESHOLD
    );
  }

  return (
    <button
      className="summary-tip"
      aria-label="About this company"
      onMouseEnter={measure}
      onFocus={measure}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span
        className={`summary-tooltip${openBelow ? ' below' : ''}`}
        role="tooltip">
        {summary}
      </span>
    </button>
  );
}

export function JobCard({
  job,
  idx,
  company,
}: {
  job: AnalyzedJob;
  idx: number;
  company?: CompanyInfo;
}) {
  return (
    <div className="job-card" style={{ animationDelay: `${idx * 30}ms` }}>
      <div className="card-header">
        <div className="card-meta">
          <div className="company-name">
            {company && <CompanyFavicon slug={company.slug} />}
            {company ? (
              <a href={company.homepage} target="_blank">
                {job.companyName}
              </a>
            ) : (
              job.companyName
            )}
            {company && <SummaryTip summary={company.summary} />}
          </div>
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
