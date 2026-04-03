import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig([
  {
    entry: ['src/cli/bin.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    external: [
      'next',
      'react',
      'react-dom',
      'fumadocs-core',
      'fumadocs-mdx',
      'fumadocs-ui',
      'chokidar',
    ],
    banner: {
      js: '#!/usr/bin/env node\n',
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    outDir: 'dist',
    external: [
      'next',
      'react',
      'react-dom',
      'fumadocs-core',
      'fumadocs-mdx',
      'fumadocs-ui',
      'chokidar',
    ],
  },
]);
