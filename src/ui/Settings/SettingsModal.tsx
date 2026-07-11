import React, { useEffect, useRef, useState } from 'react';
import { companies } from '../../analysis/companies.ts';
import {
  isValidAnalyzerSettings,
  isValidConfig,
  isValidUserInfo,
  type PartialAnalyzerSettings,
} from '../../analysis/types.ts';
import { Modal } from '../Modal.tsx';
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
] as const;

type StepId = (typeof STEPS)[number]['id'];

const ALL_COMPANY_SLUGS = Object.keys(companies);

function StepIndicator({
  step,
  goToStep,
}: {
  step: number;
  goToStep: (i: number) => void;
}) {
  return (
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
            <div className={`step-connector ${i < step ? 'done' : ''}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

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

  const bodyRef = useRef<HTMLDivElement>(null);
  // scroll to top on step change (onboarding only)
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [step]);

  /**
   * each section owns one slice of the settings and updates it explicitly
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

  const sections: Record<StepId, React.ReactNode> = {
    llm: <LLMSettings config={formData.config ?? {}} setConfig={setConfig} />,
    profile: (
      <ProfileSettings
        userInfo={formData.userInfo ?? {}}
        patchUserInfo={patchUserInfo}
        config={formData.config ?? {}}
      />
    ),
    companies: (
      <CompaniesSettings
        companiesList={formData.companiesList ?? []}
        setCompaniesList={setCompaniesList}
      />
    ),
  };

  function saveAndClose() {
    // only overwrite completed settings with a fully-valid draft
    if (!isValidAnalyzerSettings(formData)) return;
    setAppStorage({ isOnboarded: true, settings: formData });
    onClose();
  }

  // post-onboarding: one long modal with every section, edited freely and
  // saved (or discarded) as a whole
  if (appStorage.isOnboarded) {
    return (
      <Modal
        title="Settings"
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary ml-auto"
              disabled={!isValidAnalyzerSettings(formData)}
              onClick={saveAndClose}>
              Save changes
            </button>
          </>
        }>
        <div className="settings-sections">
          {STEPS.map((s) => (
            <div className="settings-section" key={s.id}>
              {sections[s.id]}
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  // onboarding: guided step-by-step flow (not dismissable until finished)
  const canContinue = STEPS[step].isValid(formData);
  function goToPrevStep() {
    if (step > 0) setStep((s) => s - 1);
  }
  function goToNextStep() {
    if (!canContinue) return;

    if (isLastStep) {
      saveAndClose();
    } else {
      // progressively save during onboarding
      setAppStorage({ isOnboarded: false, partialSettings: formData });
      setStep((s) => s + 1);
    }
  }

  return (
    <Modal
      title="JobFinder · Setup"
      header={<StepIndicator step={step} goToStep={setStep} />}
      bodyRef={bodyRef}
      footer={
        <>
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
          <button
            className="btn btn-primary ml-auto"
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
        </>
      }>
      {sections[STEPS[step].id]}
    </Modal>
  );
}
