import * as esbuild from 'esbuild';
import { type BuildOptions } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { publicDir, repoRootDir, repoUrl } from '../constants.ts';
import { isMainModule } from '../utils/node.ts';

// `ConfigName` is all config types, but `appDev` isn't buildable
// via this script since it's used via esbuild server middleware
const BUILDABLE_CONFIG_NAMES = ['appBuild', 'docsBuild', 'docsDev'] as const;
type BuildableConfigName = (typeof BUILDABLE_CONFIG_NAMES)[number];
type ConfigName = BuildableConfigName | 'appDev';

const APP_ENTRYPOINT_PATH = path.join(repoRootDir, 'src/ui/index.tsx');
const APP_OUT_DIR = path.join(publicDir, 'bundles');

const DOCS_ENTRYPOINT_PATH = path.join(repoRootDir, 'src/docs/index.tsx');
// keep the docs build temp dirs in-repo so `react` resolves from node_modules
const docsTmpDir = path.join(repoRootDir, 'node_modules/.cache');
const DOCS_BUILD_TMP_DIR = path.join(docsTmpDir, 'docs-ssr');
const DOCS_BUILD_OUT_DIR = path.join(repoRootDir, 'docs');
const DOCS_DEV_TMP_DIR = path.join(docsTmpDir, 'docs-dev');

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
  docsBuild: {
    ...baseConfig,
    entryPoints: [DOCS_ENTRYPOINT_PATH],
    outdir: DOCS_BUILD_TMP_DIR,
    define: {
      __DEV__: 'false',
      __REPO_URL__: `"${repoUrl}"`,
    },
    minify: true,
    packages: 'external',
    platform: 'node',
  },
  docsDev: {
    ...baseConfig,
    entryPoints: [DOCS_ENTRYPOINT_PATH],
    outdir: DOCS_DEV_TMP_DIR,
    define: {
      __DEV__: 'true',
      __REPO_URL__: `"${repoUrl}"`,
    },
    sourcemap: 'inline',
    // live reload
    banner: {
      js: `new EventSource('/esbuild').addEventListener('change', () => location.reload());`,
    },
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
  if (configName.startsWith('docs')) {
    return buildDocs(configName);
  }

  await esbuild.build(esbuildConfigs[configName]);
  console.error(
    `Built '${configName}' to ${repoRelPath(esbuildConfigs[configName].outdir)}`
  );
}

async function buildDocs(configName: BuildableConfigName) {
  const srcDir = path.dirname(DOCS_ENTRYPOINT_PATH);

  switch (configName) {
    case 'docsBuild': {
      const tmpDir = DOCS_BUILD_TMP_DIR;
      const outDir = DOCS_BUILD_OUT_DIR;

      try {
        const { renderToStaticMarkup } = await import('react-dom/server');
        const { default: React } = await import('react');

        // 1. build the docs into a temp dir
        const config = esbuildConfigs[configName];
        await esbuild.build(esbuildConfigs[configName]);

        // 2. import and SSR the resulting bundled component to html
        const outFileName = fileNameWithoutExt(config.entryPoints[0]);
        const outFilePath = path.join(tmpDir, `${outFileName}.js`);
        const { Docs } = await import(pathToFileURL(outFilePath).href);
        const html = renderToStaticMarkup(React.createElement(Docs));

        // 3. write the artifacts and copy required assets to the docs out dir
        await fs.rm(outDir, { recursive: true, force: true });
        await fs.mkdir(outDir, { recursive: true });
        await Promise.all([
          fs.writeFile(
            path.join(outDir, 'index.html'),
            await replaceHtmlBody(path.join(srcDir, 'index.html'), html)
          ),
          fs.copyFile(
            path.join(tmpDir, `${outFileName}.css`),
            path.join(outDir, `${outFileName}.css`)
          ),
          copyDocsAssets(outDir),
        ]);

        console.error(`Built '${configName}' to ${repoRelPath(outDir)}/`);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
      break;
    }
    case 'docsDev': {
      const tmpDir = DOCS_DEV_TMP_DIR;

      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.mkdir(tmpDir, { recursive: true });

      // 1. copy html file and required assets to the temp dir
      await copyDocsAssets(tmpDir);
      await fs.writeFile(
        path.join(tmpDir, 'index.html'),
        await fs.readFile(path.join(srcDir, 'index.html'))
      );

      // 2. start esbuild dev server from the temp dir
      const ctx = await esbuild.context(esbuildConfigs[configName]);
      await ctx.watch();
      // esbuild picks the first open port
      const { port } = await ctx.serve({
        servedir: tmpDir,
        port: process.env.PORT ? +process.env.PORT : undefined,
      });

      console.log(
        `'${configName}' dev server running at http://localhost:${port}`
      );
      return { port };
    }
  }
}

/**
 * Replaces the body of the provided html file with the provided
 * html. Uses comment markers in the original html file to identify
 * what to replace.
 */
async function replaceHtmlBody(srcPath: string, html: string): Promise<string> {
  const htmlCommentTag = (c: string) => `<!-- [${c}] -->`;
  const srcContent = await fs.readFile(srcPath, 'utf-8');

  const startTag = htmlCommentTag('BODY_START');
  const endTag = htmlCommentTag('BODY_END');
  const startIdx = srcContent.indexOf(startTag);
  const endIdx = srcContent.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Couldn't find BODY_START/BODY_END comments in ${repoRelPath(srcPath)}`
    );
  }

  return (
    srcContent.slice(0, startIdx) +
    html +
    srcContent.slice(endIdx + endTag.length)
  );
}

/**
 * Copies any `public/assets` files as well as fetching any company
 * favicons for the mock jobs displayed on the docs site.
 */
async function copyDocsAssets(destDir: string) {
  const { fetchCompanyFavicon } = await import('../utils/favicon.ts');
  const { MOCK_JOBS } = await import('../docs/mocks.ts');

  await fs.mkdir(path.join(destDir, 'assets'), { recursive: true });

  const assetsDir = path.join(publicDir, 'assets');
  const assetFileNames = await fs.readdir(assetsDir);
  for (const fileName of assetFileNames) {
    await fs.copyFile(
      path.join(assetsDir, fileName),
      path.join(destDir, 'assets', fileName)
    );
  }

  // the static site can't proxy favicons through /api/company-favicon like the
  // app does, so the sample companies' icons get baked in as files
  const faviconsDir = path.join(destDir, 'assets/favicons');
  await fs.mkdir(faviconsDir, { recursive: true });
  await Promise.all(
    MOCK_JOBS.map(async ({ company }) => {
      const icon = await fetchCompanyFavicon(company);
      if (!icon.ok) {
        throw new Error(`no favicon for sample company "${company.slug}"`);
      }

      await fs.writeFile(
        path.join(faviconsDir, `${company.slug}.png`),
        icon.body
      );
    })
  );
}

function fileNameWithoutExt(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

function repoRelPath(filePath: string) {
  return path.relative(repoRootDir, filePath);
}
