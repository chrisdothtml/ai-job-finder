import {
  type AnalyzerSettings,
  type PartialAnalyzerSettings,
} from '../analysis/types.ts';

const storageDisabled = window.location.search === '?storageDisabled';

export const defaultAppStorage: AppStorage = {
  isOnboarded: false,
  partialSettings: {},
};

class Storage<T extends object> {
  private data: T;

  constructor(
    private key: string,
    defaultValue: T
  ) {
    if (storageDisabled) {
      this.data = { ...defaultValue };
      return;
    }

    const existing = ((): T | null => {
      try {
        return JSON.parse(window.localStorage.getItem(this.key) ?? 'null');
      } catch {
        return null;
      }
    })();

    if (existing == null) {
      this.data = { ...defaultValue };
      this.save();
      return;
    }

    this.data = existing;
  }

  get() {
    return this.data;
  }

  set(data: T) {
    this.data = data;
    this.save();
  }

  update(patch: Partial<T>) {
    this.set({ ...this.data, ...patch });
  }

  private save() {
    if (storageDisabled) return;

    window.localStorage.setItem(this.key, JSON.stringify(this.data));
  }
}

export const appStorage = new Storage<AppStorage>(
  'ai-job-finder-storage',
  defaultAppStorage
);

// view preferences for the jobs list; stored under a separate key so
// full-object writes to the app storage (e.g. saving settings) can't
// clobber them
export interface UIPrefsStorage {
  minScore?: number;
  groupByCompany?: boolean;
  // stored inverted (unselected rather than selected) so companies that
  // appear in a later scrape are auto-selected, and ones that disappear
  // can simply be pruned
  unselectedCompanies?: string[];
}

export const uiPrefsStorage = new Storage<UIPrefsStorage>(
  'ai-job-finder-ui-prefs',
  { minScore: 0.8, groupByCompany: true }
);

export type AppStorage =
  | {
      isOnboarded: false;
      partialSettings: PartialAnalyzerSettings;
    }
  | {
      isOnboarded: true;
      settings: AnalyzerSettings;
    };
