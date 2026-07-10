import React, { useState } from 'react';
import './LLMBtn.css';

export type LLMBtnState = 'idle' | 'running' | 'success' | 'fail';
export interface LLMBtnFailure {
  title: string;
  msg: string;
  code?: string;
}

const stateIcons: Record<LLMBtnState, React.ReactElement> = {
  idle: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  ),
  running: <div className="spinner"></div>,
  success: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  fail: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export function LLMBtn({
  state,
  failure,
  htmlTitle,
  disabled,
  onClick,
  labels,
}: {
  state: LLMBtnState;
  failure: LLMBtnFailure | null;
  htmlTitle: string;
  disabled: boolean;
  onClick: () => void;
  labels: Record<LLMBtnState, string>;
}) {
  const text = labels[state];
  const icon = stateIcons[state];
  return (
    <div className="llm-btn-wrap">
      <button
        className={`llm-btn ${state}`}
        onClick={() => {
          if (state === 'running') return;
          onClick();
        }}
        disabled={disabled}
        title={htmlTitle}>
        {icon}
        {text}
      </button>
      {failure != null && (
        <div className="llm-btn-tooltip">
          <div className="llm-btn-tooltip-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {failure.title}
          </div>
          <div className="llm-btn-tooltip-detail">{failure.msg}</div>
          <div className="llm-btn-tooltip-code">{failure.code}</div>
        </div>
      )}
    </div>
  );
}

export interface UpdateLLMBtnOpts {
  disabled?: boolean;
  failure?: LLMBtnFailure | null;
  htmlTitle?: string;
  state?: LLMBtnState;
}

export function useLLMBtnState() {
  const [disabled, setDisabled] = useState(true);
  const [state, setState] = useState<LLMBtnState>('idle');
  const [failure, setFailure] = useState<LLMBtnFailure | null>(null);
  const [htmlTitle, setTitle] = useState('');

  function update(opts: UpdateLLMBtnOpts) {
    if (opts.disabled !== undefined) setDisabled(opts.disabled);
    if (opts.failure !== undefined) setFailure(opts.failure);
    if (opts.htmlTitle !== undefined) setTitle(opts.htmlTitle);
    if (opts.state !== undefined) setState(opts.state);
  }

  return [{ disabled, state, failure, htmlTitle }, update] as const;
}
