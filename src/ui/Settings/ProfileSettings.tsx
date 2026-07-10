import React, { useEffect, useMemo, useState } from 'react';
import {
  isValidConfig,
  isValidUserInfo,
  type PartialConfig,
  type PartialUserInfo,
} from '../../analysis/types.ts';
import { dedent, getGeoLocation } from '../../utils/shared.ts';
import { postApi } from '../api.ts';
import { FormField, FormUploadField } from './FormField.tsx';
import { LLMBtn, useLLMBtnState } from './LLMBtn.tsx';

export function ProfileSettingsView({
  userInfo,
  geoFieldsDisabled,
  allFieldsDisabled,
  patchUserInfo,
  onResumeFile,
  genSummaryBtn,
}: {
  userInfo: PartialUserInfo;
  geoFieldsDisabled: boolean;
  allFieldsDisabled: boolean;
  patchUserInfo: (patch: PartialUserInfo) => void;
  onResumeFile: (file: File) => void;
  genSummaryBtn: React.ReactElement;
}) {
  // geo is a nested object, so single-field edits spread the rest explicitly
  const patchGeo = (patch: Partial<NonNullable<PartialUserInfo['geo']>>) =>
    patchUserInfo({ geo: { ...userInfo.geo, ...patch } });

  return (
    <div className="step-content">
      <div className="step-title">Your profile</div>
      <div className="step-subtitle">
        Fill out your info and job search preferences so the AI can find the
        best matches.
      </div>

      <div className="field-row">
        <FormField
          label="Country"
          type="text"
          placeholder="United States"
          disabled={allFieldsDisabled || geoFieldsDisabled}
          value={userInfo.geo?.country ?? ''}
          onChange={(country) => patchGeo({ country })}></FormField>
        <FormField
          label="State/Region"
          type="text"
          placeholder="California"
          disabled={allFieldsDisabled || geoFieldsDisabled}
          value={userInfo.geo?.region ?? ''}
          onChange={(region) => patchGeo({ region })}></FormField>
        <FormField
          label="City"
          type="text"
          placeholder="San Francisco"
          disabled={allFieldsDisabled || geoFieldsDisabled}
          value={userInfo.geo?.city ?? ''}
          onChange={(city) => patchGeo({ city })}></FormField>
      </div>

      <div className="section-divider"></div>

      <FormField
        label="Job preferences (markdown)"
        type="textarea"
        disabled={allFieldsDisabled}
        placeholder={dedent(`
          - Startup culture, strong eng team, interesting technical domain, no banking/fintech
          - Primarily remote roles; hybrid is fine if it's a good fit and the location is close
          - IC (individual contributor) roles only, no management
        `)}
        value={userInfo.jobPrefs ?? ''}
        onChange={(jobPrefs) => patchUserInfo({ jobPrefs })}></FormField>

      <FormUploadField
        label="Resume (.pdf, .md)"
        disabled={allFieldsDisabled}
        accept={['.pdf', '.md']}
        placeholder={
          userInfo.resume
            ? 'Resume uploaded — drop a new file to replace'
            : undefined
        }
        onFile={onResumeFile}></FormUploadField>

      <FormField
        disabled
        label="Resume summary"
        labelAction={genSummaryBtn}
        type="textarea"
        hint="LLM-generated summary used to reduce context during some analysis stages (click button to generate)"
        value={userInfo.resumeSummary ?? ''}></FormField>
    </div>
  );
}

// extract the text content of a pdf resume via the server
async function parseResumePdf(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // result is a data url (`data:application/pdf;base64,<data>`)
    reader.onload = () => resolve((reader.result as string).split(',', 2)[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const res = await fetch('/api/parse-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, base64 }),
  });
  if (!res.ok) throw new Error(`Failed to parse resume (HTTP ${res.status})`);

  const { text } = (await res.json()) as { text: string };
  return text;
}

export function ProfileSettings({
  userInfo,
  patchUserInfo,
  config,
}: {
  userInfo: PartialUserInfo;
  patchUserInfo: (patch: PartialUserInfo) => void;
  // read-only; used to preload the summary-generation model
  config: PartialConfig;
}) {
  // preload resume summary ollama model on mount
  useEffect(() => {
    if (config.modelProvider !== 'ollama') return;
    if (!config.model) return;

    const { baseUrl, model } = config;
    const payload = { host: baseUrl, model };

    fetch('/api/ollama/load-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    return () => {
      fetch('/api/ollama/unload-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    };
  }, [config.modelProvider, config.baseUrl, config.model]);

  // auto-populate geo data if none exists
  const [fetchedGeo, setFetchedGeo] = useState(false);
  const { geo = {} } = userInfo;
  useEffect(() => {
    if (fetchedGeo) return;
    if (geo.country || geo.region || geo.city) {
      setFetchedGeo(true);
      return;
    }

    // dynamically fetch user geo info if there's none stored yet
    getGeoLocation()
      .then(({ country, regionName, city }) => {
        patchUserInfo({ geo: { country, region: regionName, city } });
        setFetchedGeo(true);
      })
      // if this fails, just let the user manually enter it
      .catch(() => setFetchedGeo(true));
  }, [fetchedGeo, geo.country, geo.region, geo.city]);

  const [parsingResume, setParsingResume] = useState(false);
  const onResumeFile = async (file: File) => {
    setParsingResume(true);
    try {
      const resume = file.name.toLowerCase().endsWith('.pdf')
        ? await parseResumePdf(file)
        : await file.text();

      patchUserInfo({ resume });
    } catch (err) {
      // FIXME: surface parse failures in the upload field
      console.error(err);
    } finally {
      setParsingResume(false);
    }
  };

  const [formDisabled, setFormDisabled] = useState(false);
  const [genBtnProps, updateGenBtn] = useLLMBtnState();
  const genSummaryBtn = (
    <LLMBtn
      {...genBtnProps}
      labels={{
        idle: 'Generate',
        running: 'Generating',
        success: 'Generated',
        fail: 'Failed (hover for info)',
      }}
      onClick={async () => {
        setFormDisabled(true);
        updateGenBtn({
          state: 'running',
          failure: null,
          htmlTitle: '',
        });

        const result = await postApi<{ summary: string }>(
          '/api/generate-resume-summary',
          { config, userInfo: baseUserInfo }
        );

        const htmlTitle = 'Click to re-generate';
        setFormDisabled(false);
        if (result.ok) {
          patchUserInfo({ resumeSummary: result.summary });
          updateGenBtn({ state: 'success', htmlTitle });
        } else {
          updateGenBtn({ state: 'fail', failure: result.failure, htmlTitle });
        }
      }}
    />
  );

  // user info without `resumeSummary`
  const baseUserInfo = useMemo(
    () => ({
      jobPrefs: userInfo.jobPrefs,
      resume: userInfo.resume,
      geo: userInfo.geo,
    }),
    [userInfo.jobPrefs, userInfo.resume, userInfo.geo]
  );
  // enable/disable gen btn based on changing user info (generation also
  // needs a usable llm config from the previous step)
  useEffect(() => {
    const disabled = !isValidUserInfo(baseUserInfo) || !isValidConfig(config);

    updateGenBtn({
      disabled,
      htmlTitle: disabled
        ? 'Fill out the rest of the form before generating'
        : 'Click to generate the resume summary',
    });
  }, [baseUserInfo, config]);

  useEffect(() => {
    if (!!userInfo.resumeSummary) {
      updateGenBtn({ state: 'success', htmlTitle: 'Click to re-generate' });
    }
  }, [userInfo.resumeSummary]);

  return (
    <ProfileSettingsView
      userInfo={userInfo}
      geoFieldsDisabled={!fetchedGeo}
      allFieldsDisabled={formDisabled || parsingResume}
      patchUserInfo={patchUserInfo}
      onResumeFile={onResumeFile}
      genSummaryBtn={genSummaryBtn}></ProfileSettingsView>
  );
}
