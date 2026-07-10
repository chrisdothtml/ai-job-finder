import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// paths inside the repo
export const repoRootDir = path.resolve(import.meta.dirname, '..');
export const dataDir = path.join(repoRootDir, '.data');
export const publicDir = path.join(repoRootDir, 'public');

// user-centric paths
export const userHomeDir = os.homedir();
export const userStorageDir = path.join(userHomeDir, '.ai-job-finder');
export const cacheDir = path.join(userStorageDir, '.cache');
export const convosDir = path.join(userStorageDir, '.convos');
export const jobsFile = path.join(userStorageDir, 'jobs.json');

for (const dir of [cacheDir, convosDir]) {
  await fs.mkdir(dir, { recursive: true });
}
