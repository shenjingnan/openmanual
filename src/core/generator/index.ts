import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { isDirParser, isI18nEnabled } from '../config/schema.js';
import {
  collectSlugsFromMeta,
  type MetaGroupInfo,
  scanMetaFiles,
} from '../content/meta-scanner.js';
import { scanContentDir } from '../content/scanner.js';
import { formatTitle } from '../content/tree.js';
import { generateCalloutComponent } from './callout-component.js';
import { generateGlobalCss } from './global-css.js';
import { generateI18nConfig } from './i18n-config.js';
import { generateI18nUI } from './i18n-ui.js';
import { generateLayout, isImagePath, resolveLogoPaths } from './layout.js';
import { generateLibSource } from './lib-source.js';
import { generateMermaidComponent } from './mermaid-component.js';
import { generateMiddleware } from './middleware.js';
import { generateNextConfig } from './next-config.js';
import { generatePackageJson } from './package-json.js';
import { generatePage } from './page.js';
import { generatePageActionsComponent } from './page-actions-component.js';
import { generatePostcssConfig } from './postcss-config.js';
import { generateProvider, generateSearchDialog } from './provider.js';
import { generateRawContentRoute } from './raw-content-route.js';
import { generateSearchRoute } from './search-route.js';
import { generateSourceConfig } from './source-config.js';
import { generateTsconfig } from './tsconfig.js';

export interface GenerateContext {
  config: OpenManualConfig;
  /** Absolute path to user's project root */
  projectDir: string;
  /** Absolute path to .cache/app */
  appDir: string;
  /** Content directory relative to project root */
  contentDir: string;
  /** 开发模式标志，dev 模式下不设置 output: 'export'，生成 API 路由和 rewrites */
  dev?: boolean;
  /** openmanual 项目根目录，dev 模式下用于 file: 链接到本地构建产物 */
  openmanualRoot?: string;
  /** Pre-computed slugs from meta.json or file system (replaces collectConfiguredSlugs) */
  allSlugs?: Set<string>;
}

export async function generateAll(ctx: GenerateContext): Promise<void> {
  const isI18n = isI18nEnabled(ctx.config);

  // Pre-compute slugs for page generation (replaces collectConfiguredSlugs from sidebar)
  await computeAllSlugs(ctx);

  // 基础配置文件（两种模式共用）
  const baseFiles: Array<{ path: string; content: string }> = [
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
      content: generateLibSource(ctx),
    },
    {
      path: 'lib/layout.tsx',
      content: generateLayout(ctx),
    },
    {
      path: 'components/callout.tsx',
      content: generateCalloutComponent(),
    },
    {
      path: 'components/mermaid.tsx',
      content: generateMermaidComponent(),
    },
    {
      path: 'components/page-actions.tsx',
      content: generatePageActionsComponent(),
    },
  ];

  let files: Array<{ path: string; content: string }>;

  if (isI18n) {
    // === 多语言模式：[lang]/ 动态路由结构 ===
    files = [
      ...baseFiles,
      // i18n 核心文件
      { path: 'lib/i18n.ts', content: generateI18nConfig(ctx) },
      { path: 'lib/i18n-ui.ts', content: generateI18nUI(ctx) },
      // 中间件：重定向 / 到默认语言
      { path: 'middleware.ts', content: generateMiddleware(ctx) },
      // API 路由（放在 app/ 下，middleware 排除 /api/）
      ...(ctx.dev
        ? [
            { path: 'app/api/raw/[...path]/route.ts', content: generateRawContentRoute(ctx) },
            { path: 'app/api/search/route.ts', content: generateSearchRoute(ctx) },
          ]
        : [{ path: 'app/api/search/route.ts', content: generateSearchRoute(ctx) }]),
      // [lang]/ 路由结构
      {
        path: 'app/[lang]/layout.tsx',
        content: generateRootLayoutI18n(ctx),
      },
      {
        path: 'app/[lang]/provider.tsx',
        content: generateProvider(ctx),
      },
      {
        path: 'app/[lang]/components/search-dialog.tsx',
        content: generateSearchDialog(ctx),
      },
      {
        path: 'app/[lang]/[[...slug]]/layout.tsx',
        content: generateDocsLayout(ctx),
      },
      {
        path: 'app/[lang]/[[...slug]]/page.tsx',
        content: generatePage(ctx),
      },
    ];
  } else {
    // === 单语言模式（原有结构，不变）===
    files = [
      ...baseFiles,
      // API 路由：raw content 仅 dev 模式；搜索路由两种模式都生成
      ...(ctx.dev
        ? [
            { path: 'app/api/raw/[...path]/route.ts', content: generateRawContentRoute(ctx) },
            { path: 'app/api/search/route.ts', content: generateSearchRoute(ctx) },
          ]
        : [{ path: 'app/api/search/route.ts', content: generateSearchRoute(ctx) }]),
      {
        path: 'app/layout.tsx',
        content: generateRootLayout(ctx),
      },
      {
        path: 'app/provider.tsx',
        content: generateProvider(ctx),
      },
      {
        path: 'app/components/search-dialog.tsx',
        content: generateSearchDialog(ctx),
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
  }

  for (const file of files) {
    const fullPath = join(ctx.appDir, file.path);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
  }

  // Generate logo SVG in public/ when logo is an image path
  const logo = ctx.config.navbar?.logo;
  if (logo && typeof logo === 'string' && isImagePath(logo)) {
    await ensureLogoFile(ctx, logo, 'light');
  } else if (logo && typeof logo === 'object') {
    const { light, dark } = resolveLogoPaths(logo);
    if (isImagePath(light)) {
      await ensureLogoFile(ctx, light, 'light');
    }
    if (isImagePath(dark) && dark !== light) {
      await ensureLogoFile(ctx, dark, 'dark');
    }
  }

  // Generate meta.json for each sidebar group directory
  await generateMetaFiles(ctx);
}

function generateRootLayout(ctx: GenerateContext): string {
  const { config } = ctx;
  const favicon = config.favicon;

  const metadataExport = favicon
    ? `import type { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: '${favicon}',
  },
};

`
    : '';

  return `import { AppLayout } from 'openmanual/components/app-layout';
import { AppProvider } from './provider';
import type { ReactNode } from 'react';
${metadataExport}import '../global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <AppProvider>{children}</AppProvider>
    </AppLayout>
  );
}
`;
}

/**
 * 生成 app/[lang]/layout.tsx — 多语言模式的根布局
 *
 * 与单语言模式的关键区别：
 * 1. 从 params 中获取 lang 参数
 * 2. AppLayout 接收 lang 参数设置 html lang 属性
 * 3. AppProvider 接收 lang 参数用于 i18n UI
 */
function generateRootLayoutI18n(ctx: GenerateContext): string {
  const { config } = ctx;
  const favicon = config.favicon;

  const metadataExport = favicon
    ? `import type { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: '${favicon}',
  },
};

`
    : '';

  return `${metadataExport}import { AppLayout } from 'openmanual/components/app-layout';
import { AppProvider } from './provider';
import type { ReactNode } from 'react';
import '../../global.css';

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;

  return (
    <AppLayout lang={lang}>
      <AppProvider lang={lang}>{children}</AppProvider>
    </AppLayout>
  );
}
`;
}

function generateDocsLayout(ctx: GenerateContext): string {
  const { config } = ctx;
  const githubLink = config.navbar?.github ?? '';
  const navLinks = config.navbar?.links ?? [];
  const footerText = config.footer?.text ?? '';
  const isI18n = isI18nEnabled(config);

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

  // description：i18n 模式下从当前语言首页 frontmatter 动态获取，单语言模式使用配置值
  const configDesc = config.description ?? '';
  const descLine = configDesc
    ? isI18n
      ? ''
      : `description: '${configDesc.replace(/'/g, "\\'")}',`
    : '';

  // Fumadocs reads title/icon/defaultOpen/pages from meta.json and icon from frontmatter natively.
  // No need for restructureTree() — use getPageTree() directly.
  const treeLine = isI18n ? 'tree: source.getPageTree(lang),' : 'tree: source.getPageTree(),';

  // i18n 模式下的组件签名和 baseOptions 调用
  if (isI18n) {
    const configDescSnippet = configDesc
      ? `\nconst configDescription = '${configDesc.replace(/'/g, "\\'")}' as const;\n`
      : '';

    return `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';${configDescSnippet}
export default async function DocsLayoutWrapper({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;${
    configDesc
      ? `
  const indexPage = source.getPage([], lang);
  const siteDescription = indexPage?.data.description ?? configDescription;`
      : ''
  }

  const docsOptions = {
    ...baseOptions(lang),
    ${treeLine}${githubLine}${linksLine}${footerLine}${
      configDesc ? '\n    description: siteDescription,' : ''
    }
  };

  return (
    <DocsLayout {...docsOptions}>
      {children}
    </DocsLayout>
  );
}
`;
  }

  return `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';
const docsOptions = {
  ...baseOptions(),
  ${treeLine}${githubLine}${linksLine}${footerLine}${descLine}
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

export function generateOpenManualLogoSvg(
  name: string,
  variant: 'light' | 'dark' = 'light'
): string {
  const textColor = variant === 'dark' ? '#E8E0D4' : '#000000';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 32" width="190" height="32">
  <text x="0" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="32" font-weight="700">
    <tspan fill="#2B7A4B" font-size="34">${name.charAt(0)}</tspan><tspan fill="${textColor}">${name.slice(1)}</tspan>
  </text>
</svg>
`;
}

async function ensureLogoFile(
  ctx: GenerateContext,
  logoPath: string,
  variant: 'light' | 'dark'
): Promise<void> {
  const userLogoPath = join(ctx.projectDir, 'public', logoPath.replace(/^\//, ''));
  try {
    await access(userLogoPath);
  } catch {
    const publicDir = join(ctx.appDir, 'public');
    await mkdir(publicDir, { recursive: true });
    const fullPath = join(publicDir, logoPath.replace(/^\//, ''));
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, generateOpenManualLogoSvg(ctx.config.name, variant), 'utf-8');
  }
}

/**
 * Generate or enrich meta.json files for each content directory.
 *
 * Strategy:
 * 1. If meta.json files exist → enrich missing fields (icon/defaultOpen/pages)
 * 2. If no meta.json → auto-generate from file system structure
 */

/**
 * Compute all slugs from meta.json files, falling back to file system scan.
 * Stores result in ctx.allSlugs for use by generatePage().
 */
async function computeAllSlugs(ctx: GenerateContext): Promise<void> {
  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const isI18n = isI18nEnabled(ctx.config);
  const useDirParser = isDirParser(ctx.config);
  const languages = isI18n ? (ctx.config.i18n?.languages ?? []).map((l) => l.code) : [];

  // Priority 1: Collect from meta.json files
  const metaGroups = await scanMetaFiles(contentAbsDir, languages, useDirParser);
  if (metaGroups.length > 0) {
    ctx.allSlugs = collectSlugsFromMeta(metaGroups);
    return;
  }

  // Priority 2: Collect from file system (all .mdx/.md slugs)
  const files = await scanContentDir(contentAbsDir);
  ctx.allSlugs = new Set(files.map((f) => f.slug));
}
async function generateMetaFiles(ctx: GenerateContext): Promise<void> {
  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const isI18n = isI18nEnabled(ctx.config);
  const useDirParser = isDirParser(ctx.config);
  const languages = isI18n ? (ctx.config.i18n?.languages ?? []).map((l) => l.code) : [];

  // Scan existing meta.json files
  const metaGroups = await scanMetaFiles(contentAbsDir, languages, useDirParser);

  // Enrich existing meta.json files
  if (metaGroups.length > 0) {
    for (const group of metaGroups) {
      await enrichMetaFile(group);
    }
    return;
  }

  // Auto-generate from file system structure
  await autoGenerateMetaFromFS(ctx, contentAbsDir, languages, useDirParser);
}

/**
 * Enrich an existing meta.json file with missing fields.
 * Only adds fields that are not already present (upsert semantics).
 */
async function enrichMetaFile(group: MetaGroupInfo): Promise<void> {
  try {
    const raw = await readFile(group.filePath, 'utf-8');
    const existing = JSON.parse(raw) as Record<string, unknown>;
    let changed = false;

    if (group.icon !== undefined && !existing.icon) {
      existing.icon = group.icon;
      changed = true;
    }
    if (group.defaultOpen !== undefined && existing.defaultOpen === undefined) {
      existing.defaultOpen = group.defaultOpen;
      changed = true;
    }
    if (group.pages !== undefined && group.pages.length > 0 && !Array.isArray(existing.pages)) {
      existing.pages = group.pages;
      changed = true;
    }

    if (changed) {
      await writeFile(group.filePath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
    }
  } catch {
    // File unreadable - skip enrichment
  }
}

/**
 * Auto-generate meta.json files from the file system structure.
 * Used when no meta.json and no sidebar config exist.
 */
async function autoGenerateMetaFromFS(
  _ctx: GenerateContext,
  contentAbsDir: string,
  languages: string[],
  useDirParser: boolean
): Promise<void> {
  const files = await scanContentDir(contentAbsDir);

  // Group files by their directory structure
  const rootFiles: typeof files = [];
  const dirGroups = new Map<string, typeof files>();

  for (const file of files) {
    if (file.segments.length <= 1) {
      rootFiles.push(file);
    } else {
      const dirName = file.segments[0];
      if (dirName === undefined) continue;
      if (!dirGroups.has(dirName)) {
        dirGroups.set(dirName, []);
      }
      dirGroups.get(dirName)?.push(file);
    }
  }

  // Generate root-level meta.json if there are root files
  if (rootFiles.length > 0) {
    const rootMeta = {
      title: 'Getting Started',
      pages: rootFiles.map((f) => f.name),
    };

    if (useDirParser) {
      for (const lang of languages) {
        await writeMetaIfNotExists(join(contentAbsDir, lang, 'meta.json'), rootMeta);
      }
    } else {
      await writeMetaIfNotExists(join(contentAbsDir, 'meta.json'), rootMeta);
    }
  }

  // Generate meta.json for each directory group
  for (const [dirName, dirFiles] of dirGroups) {
    const dirMeta: Record<string, unknown> = {
      title: formatTitle(dirName),
      pages: dirFiles.map((f) => f.segments.slice(1).join('/')),
    };

    if (useDirParser) {
      for (const lang of languages) {
        await writeMetaIfNotExists(join(contentAbsDir, lang, dirName, 'meta.json'), dirMeta);
      }
    } else {
      await writeMetaIfNotExists(join(contentAbsDir, dirName, 'meta.json'), dirMeta);
    }
  }
}

/**
 * Write meta.json only if it does not already exist (preserve user edits).
 */
async function writeMetaIfNotExists(
  filePath: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await access(filePath);
    // File already exists — skip to preserve user customizations
  } catch {
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  }
}
