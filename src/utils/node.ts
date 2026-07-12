import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/**
 * @example
 * if (isMainModule(import.meta)) {
 *   // run main fn
 * }
 */
export function isMainModule(meta: ImportMeta) {
  return meta.url === pathToFileURL(process.argv[1]).href;
}

export function getEnv(key: string, fallback: string): string;
export function getEnv(key: string, fallback?: undefined): string | null;
export function getEnv(key: string, fallback?: string): string | null {
  if (
    process.env.hasOwnProperty(key) &&
    typeof process.env[key] === 'string' &&
    process.env[key].length > 0
  ) {
    return process.env[key] as string;
  }

  return fallback ?? null;
}

/**
 * Gets an env var, throwing an excetion if it does't exist
 */
export function getEnvStrict(key: string) {
  const value = getEnv(key);
  if (value == null) {
    throw new Error(`Required environment var '${key}' not set`);
  }
  return value;
}

export async function pathExists(input: string) {
  return fs
    .access(input)
    .then(() => true)
    .catch(() => false);
}

export function pathExistsSync(path: string): boolean {
  try {
    fsSync.accessSync(path);
    return true;
  } catch {
    return false;
  }
}

export async function readIfExists(filePath: string) {
  if (await pathExists(filePath)) {
    return fs.readFile(filePath, 'utf-8');
  } else {
    return '';
  }
}
