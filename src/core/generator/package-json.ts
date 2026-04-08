import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpenManualConfig } from '../config/schema.js';

declare const __VERSION__: string | undefined;

function getOpenManualVersion(): string {
  if (typeof __VERSION__ !== 'undefined') {
    return __VERSION__;
  }
  // fallback: 测试环境或直接 tsx 运行时使用
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(__dirname, '../../../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
  return pkg.version;
}

export function generatePackageJson(ctx: {
  config: OpenManualConfig;
  projectDir: string;
  appDir?: string;
  dev?: boolean;
  openmanualRoot?: string;
}): string {
  const openmanualVersion = getOpenManualVersion();

  let openmanualDep: string;
  if (ctx.openmanualRoot && ctx.appDir) {
    const relPath = relative(ctx.appDir, ctx.openmanualRoot);
    openmanualDep = `file:${relPath}`;
  } else {
    openmanualDep = `^${openmanualVersion}`;
  }

  const pkg = {
    name: 'openmanual-app',
    type: 'module',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      '@tailwindcss/postcss': '^4.1.15',
      'fumadocs-core': '^16.7.7',
      'fumadocs-mdx': '^14.2.11',
      'fumadocs-ui': '^16.7.7',
      mermaid: '^11.4.0',
      next: '^16.2.1',
      'next-themes': '^0.4.6',
      openmanual: openmanualDep,
      postcss: '^8.5.8',
      react: '^19.1.0',
      'react-dom': '^19.1.0',
      tailwindcss: '^4.1.15',
      zod: '^4.0.0',
    },
    devDependencies: {
      '@types/react': '^19.1.0',
      '@types/react-dom': '^19.1.0',
    },
  };

  return `${JSON.stringify(pkg, null, 2)}\n`;
}
