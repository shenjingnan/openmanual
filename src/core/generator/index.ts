import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { generateGlobalCss } from './global-css.js';
import { generateLayout } from './layout.js';
import { generateLibSource } from './lib-source.js';
import { generateNextConfig } from './next-config.js';
import { generatePackageJson } from './package-json.js';
import { generatePage } from './page.js';
import { generatePostcssConfig } from './postcss-config.js';
import { generateProvider } from './provider.js';
import { generateSourceConfig } from './source-config.js';
import { generateTsconfig } from './tsconfig.js';

export interface GenerateContext {
  config: OpenManualConfig;
  /** Absolute path to user's project root */
  projectDir: string;
  /** Absolute path to .openmanual/app */
  appDir: string;
  /** Content directory relative to project root */
  contentDir: string;
}

export async function generateAll(ctx: GenerateContext): Promise<void> {
  const files: Array<{ path: string; content: string }> = [
    {
      path: 'source.config.ts',
      content: generateSourceConfig(ctx),
    },
    {
      path: 'next.config.mjs',
      content: generateNextConfig(ctx),
    },
    {
      path: 'global.css',
      content: generateGlobalCss(ctx),
    },
    {
      path: 'package.json',
      content: generatePackageJson(ctx),
    },
    {
      path: 'tsconfig.json',
      content: generateTsconfig(),
    },
    {
      path: 'postcss.config.mjs',
      content: generatePostcssConfig(),
    },
    {
      path: 'lib/source.ts',
      content: generateLibSource(),
    },
    {
      path: 'lib/layout.ts',
      content: generateLayout(ctx),
    },
    {
      path: 'app/layout.tsx',
      content: generateRootLayout(),
    },
    {
      path: 'app/provider.tsx',
      content: generateProvider(ctx),
    },
    {
      path: 'app/[[...slug]]/layout.tsx',
      content: generateDocsLayout(ctx),
    },
    {
      path: 'app/[[...slug]]/page.tsx',
      content: generatePage(ctx),
    },
  ];

  for (const file of files) {
    const fullPath = join(ctx.appDir, file.path);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
  }
}

function generateRootLayout(): string {
  return `import { Provider } from './provider';
import type { ReactNode } from 'react';
import '../global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
`;
}

function generateDocsLayout(ctx: GenerateContext): string {
  const { config } = ctx;
  const githubLink = config.navbar?.github ?? '';
  const navLinks = config.navbar?.links ?? [];
  const footerText = config.footer?.text ?? '';

  const linksArray = navLinks.map((l) => ({
    text: l.label,
    url: l.href,
    external: true,
  }));

  const githubLine = githubLink ? `\n    github: '${githubLink}',` : '';

  const linksLine = linksArray.length > 0 ? `\n    links: ${JSON.stringify(linksArray)},` : '';

  const footerLine = footerText
    ? `\n  footer: { children: '${footerText.replace(/'/g, "\\'")}' },`
    : '';

  return `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

const docsOptions = {
  ...baseOptions(),
  tree: source.getPageTree(),${githubLine}${linksLine}${footerLine}
};

export default function DocsLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...docsOptions}>
      {children}
    </DocsLayout>
  );
}
`;
}
