import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

const NEVER_BUNDLE = [
  'next',
  'react',
  'react-dom',
  'fumadocs-core',
  'fumadocs-mdx',
  'fumadocs-ui',
  'chokidar',
];

export default defineConfig([
  {
    entry: ['src/cli/bin.ts'],
    format: 'esm',
    target: 'es2023',
    dts: false,
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    outExtensions: () => ({ js: '.js' }),
    banner: { js: '#!/usr/bin/env node\n' },
    define: { __VERSION__: JSON.stringify(pkg.version) },
    deps: { neverBundle: NEVER_BUNDLE },
  },
  {
    entry: ['src/index.ts'],
    format: 'esm',
    target: 'es2023',
    dts: { sourcemap: false },
    sourcemap: true,
    minify: false,
    outDir: 'dist',
    outExtensions: () => ({ js: '.js' }),
    deps: { neverBundle: NEVER_BUNDLE },
  },
  {
    entry: ['src/components/**/*.tsx'],
    format: 'esm',
    target: 'es2023',
    unbundle: true,
    dts: { sourcemap: false },
    outDir: 'dist/components',
    outExtensions: () => ({ js: '.js' }),
    deps: { neverBundle: [...NEVER_BUNDLE, 'next-themes', 'mermaid'] },
  },
  {
    entry: ['src/utils/**/*.ts'],
    format: 'esm',
    target: 'es2023',
    unbundle: true,
    dts: { sourcemap: false },
    outDir: 'dist/utils',
    outExtensions: () => ({ js: '.js' }),
    deps: { neverBundle: NEVER_BUNDLE },
  },
]);
