import path from 'node:path';

export const dataDir = path.resolve(import.meta.dirname, '../.data');
export const cacheDir = path.join(dataDir, '.cache');
