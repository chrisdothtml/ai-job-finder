import React, { useEffect, useRef, useState } from 'react';

export function CompanyDropdown({
  companies,
  selected,
  onChange,
}: {
  companies: string[];
  selected: Set<string>;
  onChange: (c: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (c: string) => {
    const next = new Set(selected);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    onChange(next);
  };

  // all companies are selected by default, so the trigger only lights up
  // once some have been unselected (i.e. the list is actually filtered)
  const filtering = companies.length > 0 && selected.size < companies.length;

  return (
    <div className="dropdown-root" ref={ref}>
      <button
        className={`dropdown-trigger ${filtering ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}>
        Company
        {filtering && <span className="badge">{selected.size}</span>}
        <svg
          className={`chevron ${open ? 'open' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="dropdown-panel">
          <div className="dropdown-header">
            <span>Filter by company</span>
            <div className="dropdown-header-actions">
              <button
                className="dropdown-clear"
                onClick={() => onChange(new Set(companies))}>
                All
              </button>
              <button
                className="dropdown-clear"
                onClick={() => onChange(new Set())}>
                None
              </button>
            </div>
          </div>
          <div className="dropdown-items">
            {companies.map((c) => (
              <div key={c} className="dropdown-item" onClick={() => toggle(c)}>
                <div className={`checkbox ${selected.has(c) ? 'checked' : ''}`}>
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
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
