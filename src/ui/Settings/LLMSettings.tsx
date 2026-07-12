import React, { useEffect, useState } from 'react';
import {
  ENC_KEY_PREFIX,
  isValidConfig,
  type Config,
  type PartialConfig,
} from '../../analysis/types.ts';
import { postApi } from '../api.ts';
import { FormField } from './FormField.tsx';
import { LLMBtn, useLLMBtnState } from './LLMBtn.tsx';
import './LLMSettings.css';

type ModelProvider = Config['modelProvider'];

function LLMCard({
  selectedProvider,
  selectProvider,
  name,
  label,
  description,
  icon,
  children,
  testBtn,
}: {
  selectedProvider: ModelProvider;
  selectProvider: (p: ModelProvider) => void;
  name: ModelProvider;
  label: string;
  description: string;
  icon: React.ReactElement<React.ImgHTMLAttributes<HTMLImageElement>, 'img'>;
  children: React.ReactNode;
  testBtn?: React.ReactElement;
}) {
  const isSelected = selectedProvider === name;
  return (
    <div className={`llm-card ${isSelected ? 'selected' : ''}`}>
      <div className="llm-card-header" onClick={() => selectProvider(name)}>
        <div className="llm-radio">
          <div className="llm-radio-dot"></div>
        </div>
        <div className="llm-icon">{icon}</div>
        <div className="llm-info">
          <div className="llm-name">{label}</div>
          <div className="llm-desc">{description}</div>
        </div>
        {testBtn && isSelected && testBtn}
      </div>
      {isSelected && <div className="llm-fields">{children}</div>}
    </div>
  );
}

const defaults: { [p in ModelProvider]: PartialConfig } = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'gpt-oss:20b',
  },
  claude: {
    model: 'claude-sonnet-4-5',
  },
  chatgpt: {
    model: 'gpt-4.1-mini',
  },
};

// initial config for a fresh settings draft
export const defaultConfig: PartialConfig = {
  modelProvider: 'ollama',
  ...defaults.ollama,
};

/* FIXME:
- link to ollama.com/search in model input hints, possibly mention the one(s) chosen are proven to work well, and that switching is very experimental
-
*/
export function LLMSettings({
  config,
  setConfig,
}: {
  config: PartialConfig;
  setConfig: (config: PartialConfig) => void;
}) {
  const provider = config.modelProvider ?? 'ollama';
  const selectProvider = (p: ModelProvider) => {
    if (p === provider) return;
    // replace the full config with the new provider's defaults (so that
    // extra provider-specific fields don't get left around)
    setKeyDraft(null);
    setEncryptFailed(false);
    setConfig({ modelProvider: p, ...defaults[p] });
  };

  // the api key field is deliberately not bound to `config`: keystrokes only
  // touch this local draft, which gets encrypted (via the server) on blur
  // before landing in the form data — so a plaintext key is never stored.
  // clearing `config.apiKey` on edit keeps the form invalid (continue/test
  // disabled) until encryption completes.
  const [keyDraft, setKeyDraft] = useState<string | null>(null);
  const [encryptFailed, setEncryptFailed] = useState(false);
  const onKeyChange = (value: string) => {
    setKeyDraft(value);
    setEncryptFailed(false);
    if (config.apiKey) setConfig({ ...config, apiKey: undefined });
  };
  const onKeyBlur = async () => {
    if (!keyDraft) return;

    const result = await postApi<{ output: string }>('api/encrypt-string', {
      input: keyDraft,
    });
    if (result.ok) {
      setKeyDraft(null);
      setConfig({ ...config, apiKey: ENC_KEY_PREFIX + result.output });
    } else {
      // keep the draft around so re-focusing and blurring retries
      setEncryptFailed(true);
    }
  };
  const apiKeyHint = (providerHint: string) => {
    if (encryptFailed) {
      return "Couldn't encrypt the key (is the local server running?) — click into the field and back out to retry";
    }
    return config.apiKey
      ? 'Key is encrypted before being stored'
      : providerHint;
  };

  const [testBtnProps, updateTestBtn] = useLLMBtnState();
  const testBtn = (
    <LLMBtn
      {...testBtnProps}
      onClick={async () => {
        updateTestBtn({ state: 'running', failure: null, htmlTitle: '' });

        const result = await postApi('api/verify-llm', config);
        const htmlTitle = 'Click to re-run the validation';
        if (result.ok) {
          updateTestBtn({ state: 'success', htmlTitle });
        } else {
          updateTestBtn({ state: 'fail', failure: result.failure, htmlTitle });
        }
      }}
      labels={{
        idle: 'Test connection',
        running: 'Testing',
        success: 'Connected',
        fail: 'Failed (hover for info)',
      }}
    />
  );

  useEffect(() => {
    const disabled = !isValidConfig(config);

    updateTestBtn({
      disabled,
      state: 'idle',
      failure: null,
      htmlTitle: disabled
        ? 'First fill out the form so the connection can be tested'
        : 'Click to validate the API connection',
    });
  }, [config]);

  return (
    <div className="step-content">
      <div className="step-title">AI models</div>
      <div className="step-subtitle">
        Choose which LLM provider/models the agents will use.
      </div>

      <div className="llm-providers">
        <LLMCard
          selectedProvider={provider}
          selectProvider={selectProvider}
          name="ollama"
          label="Ollama"
          description="Run models locally on your machine"
          icon={<img src="./assets/ollama-icon.png" alt="Ollama icon" />}
          testBtn={testBtn}>
          <FormField
            label="Base URL"
            type="url"
            hint="(only change this if you're running Ollama on a separate machine)"
            placeholder={defaults.ollama.baseUrl}
            value={config.baseUrl ?? ''}
            onChange={(baseUrl) =>
              setConfig({ ...config, baseUrl })
            }></FormField>
          <FormField
            label="Model"
            type="text"
            placeholder={defaults.ollama.model}
            value={config.model ?? ''}
            onChange={(model) => setConfig({ ...config, model })}></FormField>
        </LLMCard>

        <LLMCard
          selectedProvider={provider}
          selectProvider={selectProvider}
          name="claude"
          label="Claude"
          description="Anthropic Claude models via API"
          icon={<img src="./assets/claude-icon.png" alt="Claude icon" />}
          testBtn={testBtn}>
          <FormField
            label="API Key"
            type="password"
            // stops chrome from offering to save/autofill the key
            autoComplete="new-password"
            hint={apiKeyHint('Find your key at console.anthropic.com')}
            placeholder="sk-ant-api03-..."
            value={keyDraft ?? config.apiKey ?? ''}
            onChange={onKeyChange}
            onBlur={onKeyBlur}></FormField>
          <FormField
            label="Model"
            type="text"
            placeholder={defaults.claude.model}
            value={config.model ?? ''}
            onChange={(model) => setConfig({ ...config, model })}></FormField>
        </LLMCard>

        <LLMCard
          selectedProvider={provider}
          selectProvider={selectProvider}
          name="chatgpt"
          label="ChatGPT"
          description="OpenAI GPT models via API"
          icon={<img src="./assets/chatgpt-icon.png" alt="ChatGPT icon" />}
          testBtn={testBtn}>
          <FormField
            label="API Key"
            type="password"
            // stops chrome from offering to save/autofill the key
            autoComplete="new-password"
            hint={apiKeyHint('Find your key at platform.openai.com')}
            placeholder="sk-proj-..."
            value={keyDraft ?? config.apiKey ?? ''}
            onChange={onKeyChange}
            onBlur={onKeyBlur}></FormField>
          <FormField
            label="Model"
            type="text"
            placeholder={defaults.chatgpt.model}
            value={config.model ?? ''}
            onChange={(model) => setConfig({ ...config, model })}></FormField>
        </LLMCard>
      </div>
    </div>
  );
}
