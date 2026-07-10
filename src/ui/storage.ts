import {
  type AnalyzerSettings,
  type PartialAnalyzerSettings,
} from '../analysis/types.ts';

export const defaultStorage: AppStorage = {
  isOnboarded: false,
  partialSettings: {},
};

class Storage {
  static storageKey = 'ai-job-finder-storage';

  private storage: AppStorage;
  constructor() {
    const existingStorage = JSON.parse(
      window.localStorage.getItem(Storage.storageKey) ?? 'null'
    );

    if (existingStorage == null) {
      this.storage = { ...defaultStorage };
      this.save();
      return;
    }

    this.storage = existingStorage;
  }

  get() {
    return this.storage;
  }

  set(data: AppStorage) {
    this.storage = data;
    this.save();
  }

  private save() {
    window.localStorage.setItem(
      Storage.storageKey,
      JSON.stringify(this.storage)
    );
  }
}

export const storage = new Storage();

export type AppStorage =
  | {
      isOnboarded: false;
      partialSettings: PartialAnalyzerSettings;
    }
  | {
      isOnboarded: true;
      settings: AnalyzerSettings;
    };
