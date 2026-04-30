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

  const count = selected.size;

  return (
    <div className="dropdown-root" ref={ref}>
      <button
        className={`dropdown-trigger ${count > 0 ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}>
        Company
        {count > 0 && <span className="badge">{count}</span>}
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
            {count > 0 && (
              <button
                className="dropdown-clear"
                onClick={() => onChange(new Set())}>
                Clear
              </button>
            )}
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
