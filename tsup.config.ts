import { defineConfig } from 'tsup';

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
    external: ['next', 'react', 'react-dom', 'fumadocs-core', 'fumadocs-mdx', 'fumadocs-ui'],
    banner: {
      js: '#!/usr/bin/env node\n',
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
    external: ['next', 'react', 'react-dom', 'fumadocs-core', 'fumadocs-mdx', 'fumadocs-ui'],
  },
]);
