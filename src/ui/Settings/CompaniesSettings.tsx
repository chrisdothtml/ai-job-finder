import React from 'react';
import { companies } from '../../analysis/companies.ts';
import './CompaniesSettings.css';

const ALL_COMPANY_SLUGS = Object.keys(companies);

export function CompaniesSettings({
  companiesList,
  setCompaniesList,
}: {
  companiesList: string[];
  setCompaniesList: (companiesList: string[]) => void;
}) {
  const toggle = (slug: string) => {
    setCompaniesList(
      companiesList.includes(slug)
        ? companiesList.filter((c) => c !== slug)
        : [slug, ...companiesList]
    );
  };

  const enableAll = () => setCompaniesList(ALL_COMPANY_SLUGS);
  const disableAll = () => setCompaniesList([]);

  return (
    <div className="step-content">
      <div className="step-title">Companies to scrape</div>
      <div className="step-subtitle">
        Choose which company job boards the agent will scan. You can change this
        anytime.
      </div>

      <div className="companies-actions">
        <button className="text-btn" onClick={enableAll}>
          Enable all
        </button>
        <span style={{ color: 'var(--border-hover)' }}>·</span>
        <button className="text-btn muted" onClick={disableAll}>
          Disable all
        </button>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: 'var(--text-tertiary)',
          }}>
          {companiesList.length} of {ALL_COMPANY_SLUGS.length} enabled
        </span>
      </div>

      <div className="company-grid">
        {ALL_COMPANY_SLUGS.map((slug) => (
          <div
            key={slug}
            className={`company-toggle ${companiesList.includes(slug) ? 'enabled' : ''}`}
            onClick={() => toggle(slug)}>
            <div className="company-toggle-check">
              <svg
                viewBox="0 0 10 8"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="1 4 3.5 6.5 9 1" />
              </svg>
            </div>
            <div className="company-toggle-name">{companies[slug].name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
