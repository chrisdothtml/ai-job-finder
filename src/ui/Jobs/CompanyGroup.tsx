import React, { useState } from 'react';
import { type AnalyzedJob } from '../../analysis/manager.ts';
import {
  CompanyFavicon,
  JobCard,
  SummaryTip,
  type CompanyInfo,
} from './JobCard.tsx';

export function CompanyGroup({
  name,
  jobs,
  company,
}: {
  name: string;
  jobs: AnalyzedJob[];
  company?: CompanyInfo;
}) {
  const [open, setOpen] = useState(true);

  // the whole header toggles, except clicks on its interactive children
  // (homepage link, summary tooltip)
  function onHeaderClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('a, .summary-tip')) return;
    setOpen((o) => !o);
  }

  return (
    <section className="company-group">
      <div
        className="company-group-header no-select"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onHeaderClick}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}>
        {company && (
          <CompanyFavicon slug={company.slug} src={company.faviconSrc} />
        )}
        <span className="company-group-name">
          {company ? (
            <a href={company.homepage} target="_blank">
              {name}
            </a>
          ) : (
            name
          )}
        </span>
        {company && <SummaryTip summary={company.summary} />}
        <span className="company-group-count">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        </span>
        <svg
          className={`chevron ${open ? 'open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div className="company-group-body">
          <div className="job-grid">
            {jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                idx={i}
                company={company}
                hideCompany
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
