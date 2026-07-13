import * as esbuild from 'esbuild';
import { type BuildOptions } from 'esbuild';
import path from 'node:path';
import process from 'node:process';
import { publicDir, repoRootDir } from '../constants.ts';
import { isMainModule } from '../utils/node.ts';

// `ConfigName` is all config types, but `appDev` isn't buildable
// via this script since it's used via esbuild server middleware
const BUILDABLE_CONFIG_NAMES = ['appBuild'] as const;
type BuildableConfigName = (typeof BUILDABLE_CONFIG_NAMES)[number];
type ConfigName = BuildableConfigName | 'appDev';

const APP_ENTRYPOINT_PATH = path.join(repoRootDir, 'src/ui/index.tsx');
const APP_OUT_DIR = path.join(publicDir, 'bundles');

const baseConfig: BuildOptions = {
  bundle: true,
  external: ['node:*'],
  format: 'esm',
};

export const esbuildConfigs = {
  appBuild: {
    ...baseConfig,
    entryPoints: [APP_ENTRYPOINT_PATH],
    outdir: APP_OUT_DIR,
    define: { __DEV__: 'false' },
    minify: true,
  },
  appDev: {
    ...baseConfig,
    entryPoints: [APP_ENTRYPOINT_PATH],
    outdir: APP_OUT_DIR,
    define: { __DEV__: 'true' },
    sourcemap: 'inline',
  },
} as const satisfies Record<ConfigName, BuildOptions>;

if (isMainModule(import.meta)) {
  const [configName] = process.argv.slice(2) as [BuildableConfigName];
  if (!configName || !BUILDABLE_CONFIG_NAMES.includes(configName)) {
    console.error(
      `ERROR: config name must be one of: ${BUILDABLE_CONFIG_NAMES.join(', ')}`
    );
    process.exit(1);
  }

  await build(configName);
}

export async function build(configName: BuildableConfigName) {
  await esbuild.build(esbuildConfigs[configName]);
  console.error(
    `Built '${configName}' to ${repoRelPath(esbuildConfigs[configName].outdir)}`
  );
}

function repoRelPath(filePath: string) {
  return path.relative(repoRootDir, filePath);
}
