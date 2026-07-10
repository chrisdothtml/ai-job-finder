export interface UserGeo {
  country: string;
  region: string;
  city: string;
}

// FIXME: revisit the names for these to be analyzer-centric (`UserInfo` and `Config` are vague)
export interface UserInfo {
  resume: string;
  resumeSummary: string;
  jobPrefs: string;
  geo: UserGeo;
}

export type PartialUserInfo = Omit<Partial<UserInfo>, 'geo'> & {
  geo?: Partial<UserGeo>;
};

// NOTE: `resumeSummary` is intentionally not required here; it gets generated
// after the rest of the user info is filled out (callers that need it should
// check it separately)
export function isValidUserInfo(d?: PartialUserInfo): d is UserInfo {
  if (!d || typeof d !== 'object') return false;
  if (!d.resume || !d.jobPrefs || !d.geo) return false;

  const { geo } = d;
  if (!geo.country || !geo.region || !geo.city) return false;

  return true;
}

export interface Config {
  modelProvider: 'ollama' | 'claude' | 'chatgpt';
  baseUrl?: string;
  apiKey?: string;
  model: string;
}

export type PartialConfig = Partial<Config>;

// api keys are only ever stored/sent encrypted (via `/api/encrypt-string`),
// marked with this prefix; `resolveLLM` decrypts prefixed keys server-side
export const ENC_KEY_PREFIX = 'enc:';

export function isValidConfig(d?: PartialConfig): d is Config {
  if (!d || typeof d !== 'object') return false;
  if (!d.modelProvider || !d.model) return false;

  if (!['ollama', 'claude', 'chatgpt'].includes(d.modelProvider)) return false;

  if (d.modelProvider === 'ollama' && !d.baseUrl) return false;

  // requiring the prefix (rather than just a non-empty key) keeps the form
  // invalid while a freshly-entered key is still being encrypted, and stops
  // plaintext keys from reaching the server endpoints
  if (
    ['claude', 'chatgpt'].includes(d.modelProvider) &&
    !d.apiKey?.startsWith(ENC_KEY_PREFIX)
  ) {
    return false;
  }

  return true;
}

export function isValidCompaniesList(d?: string[]): d is string[] {
  return Array.isArray(d) && d.length > 0;
}

export interface AnalyzerSettings {
  userInfo: UserInfo;
  config: Config;
  companiesList: string[];
}

export interface PartialAnalyzerSettings {
  userInfo?: PartialUserInfo;
  config?: PartialConfig;
  companiesList?: string[];
}

export function isValidAnalyzerSettings(
  d?: PartialAnalyzerSettings
): d is AnalyzerSettings {
  if (!d || typeof d !== 'object') return false;
  return (
    isValidUserInfo(d.userInfo) &&
    isValidConfig(d.config) &&
    isValidCompaniesList(d.companiesList)
  );
}

export enum AnalysisStateStatus {
  Aborted = 'ABORTED',
  Complete = 'COMPLETE',
  Idle = 'IDLE',
  Running = 'RUNNING',
}

export interface AnalysisState {
  status: AnalysisStateStatus;
  percent: number;
  messages: string[];
  errors: string[];
  startTs: number;
  finishTs: number;
}
