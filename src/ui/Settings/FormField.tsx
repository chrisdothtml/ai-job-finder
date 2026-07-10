import React, { useRef, useState } from 'react';
import './FormField.css';

export function FormField({
  label,
  labelAction,
  onChange,
  hint,
  ...props
}: Omit<React.HTMLProps<HTMLInputElement>, 'label' | 'onChange'> & {
  label: string;
  // rendered on the same line as the label, pinned to the right
  labelAction?: React.ReactNode;
  onChange?: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label>{label}</label>
        {labelAction}
      </div>
      {props.type === 'textarea' ? (
        // @ts-expect-error
        <textarea
          {...props}
          onChange={(e) => onChange?.(e.target.value)}></textarea>
      ) : (
        <input {...props} onChange={(e) => onChange?.(e.target.value)} />
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function FormUploadField({
  label,
  labelAction,
  onFile,
  hint,
  accept = [],
  disabled,
  placeholder = 'Drop a file here or click to browse',
}: {
  label: string;
  /**
   * Element to be rendered on the same line as the label,
   * pinned to the right
   */
  labelAction?: React.ReactNode;
  onFile: (file: File) => void;
  hint?: string;
  /** Array of file extensions to accept (e.g. ['.pdf', '.md']) */
  accept?: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // normalize accepted extensions
  accept = accept.map((e) => e.toLowerCase());

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;
    setDisplayName(file.name);
    onFile(file);
  };

  return (
    <div className="field">
      <div className="field-label-row">
        <label>{label}</label>
        {labelAction}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept?.join(',')}
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // allow re-selecting the same file
          e.target.value = '';
        }}
      />
      <div
        className={[
          'upload-zone',
          displayName ? 'has-file' : '',
          dragging ? 'drag-over' : '',
          disabled ? 'disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);

          // dropped content may not be a file (e.g. selected text)
          const file = e.dataTransfer.files?.[0];
          if (!file) return;

          const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
          if (accept.length && !accept.includes(ext)) return;

          handleFile(file);
        }}>
        <div className="upload-icon">
          {displayName ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          )}
        </div>
        <div className="upload-title">{displayName ?? placeholder}</div>
        {displayName && <div className="upload-sub">Click to replace</div>}
      </div>
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
