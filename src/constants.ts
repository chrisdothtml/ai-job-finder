import path from 'node:path';

export const repoRootDir = path.resolve(import.meta.dirname, '..');
export const dataDir = path.join(repoRootDir, '.data');
export const cacheDir = path.join(dataDir, '.cache');
