import React, { useEffect, useRef, useState } from 'react';
import { type Company } from '../../analysis/companies.ts';
import { type AnalyzedJob } from '../../analysis/manager.ts';
import { ScoreRing } from './ScoreRing.tsx';

export type CompanyInfo = Company & {
  slug: string;
  // overrides the favicon API endpoint; the static docs site has no server,
  // so its build bakes the icons into the page's assets instead
  faviconSrc?: string;
};

// renders nothing if the favicon can't be fetched (e.g. the company's
// homepage changed and google has no icon for the old domain)
export function CompanyFavicon({ slug, src }: { slug: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className="company-favicon"
      src={src ?? `api/company-favicon/${slug}`}
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

export function SummaryTip({ summary }: { summary: string }) {
  // hover shows the tooltip on mouse devices (CSS); tapping/clicking pins it
  // open, which is the only way to reach it on touch screens
  const [open, setOpen] = useState(false);
  const [openBelow, setOpenBelow] = useState(false);
  const [shiftPx, setShiftPx] = useState(0);
  const ref = useRef<HTMLButtonElement>(null);

  // a pinned tooltip dismisses on any tap/click elsewhere (on touch there's
  // no hover-out to dismiss it naturally)
  useEffect(() => {
    if (!open) return;
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  // measured when the tooltip is triggered rather than on scroll, since the
  // position only matters at the moment it becomes visible
  function measure(el: HTMLButtonElement) {
    const rect = el.getBoundingClientRect();
    setOpenBelow(rect.top < TOOLTIP_FLIP_THRESHOLD);

    // shift the tooltip horizontally when centering it on the icon would
    // push it past a viewport edge (the arrow counter-shifts in CSS to stay
    // on the icon)
    const margin = 12;
    const center = rect.left + rect.width / 2;
    const half = Math.min(260, window.innerWidth - margin * 2) / 2;
    let shift = 0;
    if (center - half < margin) {
      shift = margin - (center - half);
    } else if (center + half > window.innerWidth - margin) {
      shift = window.innerWidth - margin - (center + half);
    }
    setShiftPx(shift);
  }

  return (
    <button
      ref={ref}
      className={`summary-tip${open ? ' open' : ''}`}
      aria-label="About this company"
      aria-expanded={open}
      onMouseEnter={(e) => measure(e.currentTarget)}
      onFocus={(e) => measure(e.currentTarget)}
      onClick={(e) => {
        measure(e.currentTarget);
        setOpen((o) => !o);
      }}>
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
        role="tooltip"
        style={{ '--tip-shift': `${shiftPx}px` } as React.CSSProperties}>
        {summary}
      </span>
    </button>
  );
}

export function JobCard({
  job,
  idx,
  company,
  hideCompany,
  className = '',
}: {
  job: AnalyzedJob;
  idx: number;
  company?: CompanyInfo;
  // set when a surrounding company group already shows the company info
  hideCompany?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`job-card ${className}`}
      style={{ animationDelay: `${idx * 30}ms` }}>
      <div className="card-header">
        <div className="card-meta">
          {!hideCompany && (
            <div className="company-name">
              {company && (
                <CompanyFavicon slug={company.slug} src={company.faviconSrc} />
              )}
              {company ? (
                <a href={company.homepage} target="_blank">
                  {job.companyName}
                </a>
              ) : (
                job.companyName
              )}
              {company && <SummaryTip summary={company.summary} />}
            </div>
          )}
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
          {job.cons || '(none)'}
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
