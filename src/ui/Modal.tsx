import React from 'react';
import './Modal.css';

export function Modal({
  title,
  onClose,
  header,
  footer,
  children,
  bodyRef,
}: {
  title: string;
  /** when provided, shows a close button and enables click-outside-to-close */
  onClose?: () => void;
  /** extra header content below the title row (e.g. a step indicator) */
  header?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  bodyRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-top-row">
            <span className="modal-wordmark">{title}</span>
            {onClose && (
              <button
                className="modal-close"
                onClick={onClose}
                aria-label="Close">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {header}
        </div>

        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>

        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  );
}
