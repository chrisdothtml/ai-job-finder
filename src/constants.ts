import path from 'node:path';

export const repoRootDir = path.resolve(import.meta.dirname, '..');
export const dataDir = path.join(repoRootDir, '.data');
export const cacheDir = path.join(dataDir, '.cache');
export const convosDir = path.join(dataDir, '.convos');
export const publicDir = path.join(repoRootDir, 'public');
