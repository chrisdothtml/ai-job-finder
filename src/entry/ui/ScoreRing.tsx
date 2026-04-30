import React from 'react';

function scoreColor(s: number) {
  if (s >= 0.85)
    return {
      ring: 'oklch(50% 0.13 145)',
      track: 'oklch(88% 0.06 145)',
      bg: 'oklch(96% 0.03 145)',
      text: 'oklch(35% 0.1 145)',
    };
  if (s >= 0.7)
    return {
      ring: 'oklch(62% 0.14 115)',
      track: 'oklch(89% 0.06 115)',
      bg: 'oklch(96.5% 0.025 115)',
      text: 'oklch(38% 0.1 115)',
    };
  if (s >= 0.55)
    return {
      ring: 'oklch(62% 0.13 55)',
      track: 'oklch(87% 0.07 65)',
      bg: 'oklch(96.5% 0.025 75)',
      text: 'oklch(40% 0.09 55)',
    };
  return {
    ring: 'oklch(55% 0.15 25)',
    track: 'oklch(88% 0.06 25)',
    bg: 'oklch(97% 0.02 25)',
    text: 'oklch(40% 0.1 25)',
  };
}

export function ScoreRing({ score }: { score: number }) {
  const c = scoreColor(score);
  const pct = Math.round(score * 100);
  const r = 20,
    cx = 24,
    cy = 24,
    circ = 2 * Math.PI * r;
  const dash = circ * score;
  return (
    <div className="score-badge">
      <div className="score-ring" style={{ background: c.bg, color: c.text }}>
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx={cx} cy={cy} r={r} stroke={c.track} strokeWidth="3.5" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={c.ring}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
          />
        </svg>
        <span className="score-num">{pct}%</span>
      </div>
      <span className="score-label">Match</span>
    </div>
  );
}
