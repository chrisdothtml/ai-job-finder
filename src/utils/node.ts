import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import process from 'node:process';

export function getEnv(key: string, fallback: string): string;
export function getEnv(key: string, fallback?: undefined): string | null;
export function getEnv(key: string, fallback?: string): string | null {
  if (process.env.hasOwnProperty(key)) {
    return process.env[key] as string;
  }

  return fallback ?? null;
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
