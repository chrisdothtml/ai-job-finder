import React, { useEffect, useState } from 'react';
import { type Company } from '../../analysis/companies.ts';
import { type AnalyzedJob } from '../../analysis/manager.ts';
import { type AnalyzerSettings } from '../../analysis/types.ts';
import { uiPrefsStorage } from '../storage.ts';
import { AnalysisPanel } from './AnalysisPanel.tsx';
import { CompanyDropdown } from './CompanyDropdown.tsx';
import { CompanyGroup } from './CompanyGroup.tsx';
import { JobCard, type CompanyInfo } from './JobCard.tsx';
import './Jobs.css';
import { Logo } from './Logo.tsx';

async function fetchJobs(): Promise<AnalyzedJob[]> {
  return fetch('api/jobs').then((r) => r.json()) as Promise<AnalyzedJob[]>;
}

// keyed by company display name, since jobs only carry `companyName`
async function fetchCompanyInfo(): Promise<Map<string, CompanyInfo>> {
  const data = (await fetch('api/companies').then((r) => r.json())) as Record<
    string,
    Company
  >;
  return new Map(
    Object.entries(data).map(([slug, company]) => [
      company.name,
      { ...company, slug },
    ])
  );
}

type SortTypes = 'score-desc' | 'score-asc' | 'company' | 'title';

export function Jobs({
  settings,
  onOpenSettings,
}: {
  settings: AnalyzerSettings;
  onOpenSettings: () => void;
}) {
  const [jobs, setJobs] = useState<AnalyzedJob[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Map<string, CompanyInfo>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState(new Set<string>());
  const [minScore, setMinScore] = useState(
    () => uiPrefsStorage.get().minScore ?? 0
  );
  const [groupByCompany, setGroupByCompany] = useState(
    () => uiPrefsStorage.get().groupByCompany ?? false
  );
  const [sortBy, setSortBy] = useState<SortTypes>('score-desc');

  // ran on mount and again whenever an analysis run finishes
  function loadJobs() {
    fetchJobs()
      .then((data) => {
        setJobs(data);
        // all companies start selected except previously unselected ones;
        // pruning stale prefs entries here means companies that reappear
        // later come back selected, like any other new company
        const selected = new Set(data.map((j) => j.companyName));
        const unselected = (
          uiPrefsStorage.get().unselectedCompanies ?? []
        ).filter((c) => selected.has(c));
        uiPrefsStorage.update({ unselectedCompanies: unselected });
        for (const c of unselected) selected.delete(c);
        setSelectedCompanies(selected);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadJobs();
    fetchCompanyInfo()
      .then(setCompanyInfo)
      .catch(() => {});
  }, []);

  const companies = [...new Set(jobs.map((j) => j.companyName))].sort();

  const filtered = jobs
    .filter((j) => {
      if (!selectedCompanies.has(j.companyName)) return false;
      if (j.fitScore < minScore) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return [j.title, j.companyName, j.location, j.pros, j.cons].some(
          (field) => field?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score-desc':
          return b.fitScore - a.fitScore;
        case 'score-asc':
          return a.fitScore - b.fitScore;
        case 'company':
          return a.companyName.localeCompare(b.companyName);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // groups follow the encounter order of the sorted list, so e.g. with
  // "Match: High → Low" the company with the single best match comes first
  const grouped = new Map<string, AnalyzedJob[]>();
  if (groupByCompany) {
    for (const job of filtered) {
      const group = grouped.get(job.companyName) ?? [];
      group.push(job);
      grouped.set(job.companyName, group);
    }
  }

  const scoreLabel = minScore === 0 ? 'Any' : `≥${Math.round(minScore * 100)}%`;

  return (
    <>
      <header className="toolbar no-select">
        <div className="toolbar-inner">
          <Logo className="header-logo"></Logo>
          <span className="wordmark">JobFinder</span>
          <div className="divider" />

          {/* Search */}
          <div className="search-wrap">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search jobs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="toolbar-filters">
            {/* Company filter */}
            <CompanyDropdown
              companies={companies}
              selected={selectedCompanies}
              onChange={(next) => {
                setSelectedCompanies(next);
                uiPrefsStorage.update({
                  unselectedCompanies: companies.filter((c) => !next.has(c)),
                });
              }}
            />

            {/* Score filter */}
            <div className="score-filter">
              <label>Match</label>
              <input
                className="score-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={minScore}
                onChange={(e) => {
                  const value = +e.target.value;
                  setMinScore(value);
                  uiPrefsStorage.update({ minScore: value });
                }}
              />
              <span className="score-val">{scoreLabel}</span>
            </div>

            {/* Sort */}
            <select
              className="sort-select no-select"
              value={sortBy}
              // @ts-expect-error
              onChange={(e) => setSortBy(e.target.value)}>
              <option value="score-desc">Match: High → Low</option>
              <option value="score-asc">Match: Low → High</option>
              <option value="company">Company A → Z</option>
              <option value="title">Title A → Z</option>
            </select>

            {/* Group by company */}
            <label className="group-toggle">
              <input
                type="checkbox"
                checked={groupByCompany}
                onChange={(e) => {
                  setGroupByCompany(e.target.checked);
                  uiPrefsStorage.update({ groupByCompany: e.target.checked });
                }}
              />
              <span className={`checkbox ${groupByCompany ? 'checked' : ''}`}>
                <svg
                  viewBox="0 0 10 8"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="1 4 3.5 6.5 9 1" />
                </svg>
              </span>
              Group by company
            </label>

            <span className="result-count">
              {loading ? '—' : `${filtered.length} of ${jobs.length} jobs`}
            </span>
          </div>
        </div>
      </header>

      <main className="main">
        <AnalysisPanel
          settings={settings}
          hasJobs={jobs.length > 0}
          onOpenSettings={onOpenSettings}
          reloadJobs={loadJobs}
        />
        {loading ? (
          <div className="empty">
            <p>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No jobs found</div>
            <p>
              {jobs.length > 0
                ? 'Try adjusting your search or filters.'
                : 'Run the job analysis to see them here.'}
            </p>
          </div>
        ) : groupByCompany ? (
          <div className="company-groups">
            {[...grouped].map(([name, groupJobs]) => (
              <CompanyGroup
                key={name}
                name={name}
                jobs={groupJobs}
                company={companyInfo.get(name)}
              />
            ))}
          </div>
        ) : (
          <div className="job-grid">
            {filtered.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                idx={i}
                company={companyInfo.get(job.companyName)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
