import React, { useEffect, useRef, useState } from 'react';
import { companies } from '../../analysis/companies.ts';
import {
  isValidAnalyzerSettings,
  isValidConfig,
  isValidUserInfo,
  type PartialAnalyzerSettings,
} from '../../analysis/types.ts';
import { type AppStorage } from '../storage.ts';
import { CompaniesSettings } from './CompaniesSettings.tsx';
import { defaultConfig, LLMSettings } from './LLMSettings.tsx';
import { ProfileSettings } from './ProfileSettings.tsx';
import './SettingsModal.css';

const STEPS = [
  {
    id: 'llm',
    label: 'AI Models',
    isValid: (d: PartialAnalyzerSettings) => isValidConfig(d.config),
  },
  {
    id: 'profile',
    label: 'Profile',
    isValid: (d: PartialAnalyzerSettings) =>
      isValidUserInfo(d.userInfo) && !!d.userInfo.resumeSummary,
  },
  {
    id: 'companies',
    label: 'Companies',
    isValid: (d: PartialAnalyzerSettings) => isValidAnalyzerSettings(d),
  },
];

const ALL_COMPANY_SLUGS = Object.keys(companies);

export function SettingsModal({
  appStorage,
  onClose,
  setAppStorage,
}: {
  appStorage: AppStorage;
  onClose: () => void;
  setAppStorage: (s: AppStorage) => void;
}) {
  const [step, setStep] = useState(0);
  const isLastStep = step === STEPS.length - 1;
  const [formData, setFormData] = useState<PartialAnalyzerSettings>(() => ({
    // defaults for sections that have them; stored data wins when present
    config: defaultConfig,
    companiesList: ALL_COMPANY_SLUGS,
    ...(appStorage.isOnboarded
      ? appStorage.settings
      : appStorage.partialSettings),
  }));
  const canContinue = STEPS[step].isValid(formData);

  const bodyRef = useRef<HTMLDivElement>(null);
  // scroll to top on step change
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  /**
   * each step owns one section of the settings and updates it explicitly
   * (no deep merging). `patchUserInfo` shallow-patches so that async writers
   * (geo fetch, resume parse, summary generation) can't clobber each other;
   * nested objects (geo) must be passed whole.
   */
  function patchUserInfo(patch: PartialAnalyzerSettings['userInfo']) {
    setFormData((prev) => ({
      ...prev,
      userInfo: { ...prev.userInfo, ...patch },
    }));
  }
  /**
   * config is replaced wholesale so switching providers can't leave stale
   * provider-specific fields around
   */
  function setConfig(config: PartialAnalyzerSettings['config']) {
    setFormData((prev) => ({ ...prev, config }));
  }
  function setCompaniesList(companiesList: string[]) {
    setFormData((prev) => ({ ...prev, companiesList }));
  }

  function goToStep(i: number) {
    setStep(i);
  }
  function goToPrevStep() {
    if (step > 0) setStep((s) => s - 1);
  }
  function goToNextStep() {
    if (!canContinue) return;

    if (!appStorage.isOnboarded && !isLastStep) {
      // progressively save during onboarding
      setAppStorage({ isOnboarded: false, partialSettings: formData });
    } else if (isValidAnalyzerSettings(formData)) {
      // only overwrite completed settings with a fully-valid draft
      setAppStorage({ isOnboarded: true, settings: formData });
    }

    if (isLastStep) {
      onClose();
    } else {
      if (step < STEPS.length - 1) setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (!appStorage.isOnboarded) return;
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-top-row">
            <span className="modal-wordmark">
              {appStorage.isOnboarded ? 'Settings' : 'JobFinder · Setup'}
            </span>
            {appStorage.isOnboarded && (
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

          {/* Step indicator */}
          <div className="step-indicator">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="step-item">
                  <div
                    className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                    style={{ cursor: i < step ? 'pointer' : 'default' }}
                    onClick={() => i < step && goToStep(i)}>
                    {i < step ? (
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <polyline points="1 4 3.5 6.5 9 1" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`step-label ${i === step ? 'active' : ''}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`step-connector ${i < step ? 'done' : ''}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" ref={bodyRef}>
          {step === 0 && (
            <LLMSettings config={formData.config ?? {}} setConfig={setConfig} />
          )}
          {step === 1 && (
            <ProfileSettings
              userInfo={formData.userInfo ?? {}}
              patchUserInfo={patchUserInfo}
              config={formData.config ?? {}}
            />
          )}
          {step === 2 && (
            <CompaniesSettings
              companiesList={formData.companiesList ?? []}
              setCompaniesList={setCompaniesList}
            />
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={goToPrevStep}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          )}
          <div
            className="ml-auto"
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              disabled={!canContinue}
              onClick={goToNextStep}>
              {isLastStep ? 'Save & finish' : 'Continue'}
              {!isLastStep && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
