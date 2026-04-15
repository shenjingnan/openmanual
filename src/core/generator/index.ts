import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { isDirParser, isI18nEnabled } from '../config/schema.js';
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
import { generateOpenAPIFiles, preInjectOpenAPISidebar } from './openapi-generate.js';

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
}

export async function generateAll(ctx: GenerateContext): Promise<void> {
  const isI18n = isI18nEnabled(ctx.config);

  // [OpenAPI] 预注入 sidebar 配置（在生成 page.tsx 之前，确保 allowedSlugs 包含 API 页面）
  if (ctx.config.openapi) {
    await preInjectOpenAPISidebar(ctx);
  }

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

  // Generate OpenAPI files if configured（sidebar 已在流程开头预注入）
  if (ctx.config.openapi) {
    await generateOpenAPIFiles(ctx);
    // 重新生成 meta.json 以包含 API 页面的 meta.json
    await generateMetaFiles(ctx);
  }
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
 * Generate complete meta.json for each sidebar group directory.
 * Writes title, icon, defaultOpen, and pages ordering so that Fumadocs
 * can render the sidebar natively without restructureTree().
 *
 * In dir-parser mode, generates meta.json inside each language subdirectory
 * (e.g. content/zh/guide/meta.json). In dot-parser mode, generates at the
 * group directory level with locale-suffixed files for i18n.
 */
async function generateMetaFiles(ctx: GenerateContext): Promise<void> {
  const sidebar = ctx.config.sidebar;
  if (!sidebar || sidebar.length === 0) return;

  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const isI18n = isI18nEnabled(ctx.config);
  const useDirParser = isDirParser(ctx.config);
  const languages = isI18n ? (ctx.config.i18n?.languages ?? []).map((l) => l.code) : [];

  for (const group of sidebar) {
    // Determine if this is a root-level group (all slugs have no "/")
    const isRootGroup = group.pages.every((p) => !p.slug.includes('/'));

    if (isRootGroup) {
      // Root-level pages: generate meta.json at content root (or per-language root)
      await generateRootMetaJson(ctx, group, contentAbsDir, languages, useDirParser);
      continue;
    }

    // Directory-level group: extract directory prefix from slug
    const dirPrefix = group.pages
      .map((p) => p.slug)
      .find((slug) => slug.includes('/'))
      ?.split('/')[0];

    if (!dirPrefix) continue;

    // Build complete meta object from sidebar group config
    const metaObj: Record<string, unknown> = {
      title: group.group,
    };
    if (group.icon) metaObj.icon = group.icon;
    if (group.collapsed !== undefined) metaObj.defaultOpen = !group.collapsed;

    // Extract page filenames (strip directory prefix: "guide/configuration" -> "configuration")
    const pageFiles = group.pages
      .filter((p) => p.slug.startsWith(`${dirPrefix}/`))
      .map((p) => p.slug.split('/').slice(1).join('/'));
    if (pageFiles.length > 0) metaObj.pages = pageFiles;

    if (useDirParser) {
      // Dir parser: write meta.json into each language subdirectory
      for (const lang of languages) {
        const langDir = join(contentAbsDir, lang, dirPrefix);
        await writeMetaIfNotExists(join(langDir, 'meta.json'), metaObj);
      }
    } else {
      // Dot parser: write at group directory level
      const dirPath = join(contentAbsDir, dirPrefix);
      await writeMetaIfNotExists(join(dirPath, 'meta.json'), metaObj);

      // i18n dot-parser: generate locale-suffixed meta files
      if (isI18n) {
        for (const lang of languages) {
          if (lang === ctx.config.i18n?.defaultLanguage) continue;
          await writeMetaIfNotExists(join(dirPath, `meta.${lang}.json`), metaObj);
        }
      }
    }
  }

  // Inject page-level icon/title into frontmatter for all pages
  await injectPageFrontmatter(ctx);
}

/**
 * Generate meta.json for root-level page groups (pages without directory prefix).
 * Writes to content/{lang}/meta.json (dir-parser) or content/meta.json (dot-parser).
 */
async function generateRootMetaJson(
  _ctx: GenerateContext,
  group: {
    group: string;
    icon?: string | undefined;
    collapsed?: boolean | undefined;
    pages: Array<{ slug: string; title: string; icon?: string | undefined }>;
  },
  contentAbsDir: string,
  languages: string[],
  useDirParser: boolean
): Promise<void> {
  const metaObj: Record<string, unknown> = {
    title: group.group,
  };
  if (group.icon) metaObj.icon = group.icon;
  if (group.collapsed !== undefined) metaObj.defaultOpen = !group.collapsed;

  // Root-level meta.json must NOT include "pages" field.
  // In fumadocs, if a meta.json has "pages", ONLY those items become children
  // and sub-directory auto-discovery is SKIPPED entirely.
  // Without "pages", fumadocs auto-discovers both root pages AND sub-folders,
  // each sub-folder then uses its own meta.json for ordering.
  // See: PageTreeBuilder.folder() in fumadocs-core source/index.js

  if (useDirParser) {
    for (const lang of languages) {
      await writeMetaIfNotExists(join(contentAbsDir, lang, 'meta.json'), metaObj);
    }
  } else {
    await writeMetaIfNotExists(join(contentAbsDir, 'meta.json'), metaObj);
  }
}

/**
 * Upsert meta.json: merge new data into existing file.
 *
 * New fields from `data` overwrite existing ones, but any extra fields
 * already in the file (e.g. user customizations) are preserved.
 * This ensures that incomplete meta.json from earlier builds get
 * updated with full `pages` arrays etc.
 */
async function writeMetaIfNotExists(
  filePath: string,
  data: Record<string, unknown>
): Promise<void> {
  let existing: Record<string, unknown> = {};
  try {
    const raw = await readFile(filePath, 'utf-8');
    existing = JSON.parse(raw);
    if (typeof existing !== 'object' || existing === null) {
      existing = {};
    }
  } catch {
    // File doesn't exist or is invalid JSON — start fresh
  }

  const merged = { ...existing, ...data };
  await mkdir(join(filePath, '..'), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

/**
 * Inject page-level title and icon from sidebar config into each .mdx file's frontmatter.
 * Uses upsert semantics: only writes fields that are missing from existing frontmatter.
 */
async function injectPageFrontmatter(ctx: GenerateContext): Promise<void> {
  const sidebar = ctx.config.sidebar;
  if (!sidebar) return;

  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const useDirParser = isDirParser(ctx.config);
  const languages = isI18nEnabled(ctx.config)
    ? (ctx.config.i18n?.languages ?? []).map((l) => l.code)
    : [];

  for (const group of sidebar) {
    for (const page of group.pages) {
      const fieldsToInject: Record<string, string> = {};
      if (page.title) fieldsToInject.title = page.title;
      if (page.icon) fieldsToInject.icon = page.icon;

      if (Object.keys(fieldsToInject).length === 0) continue;

      // Determine target file paths based on parser mode
      const targets = resolveMdxPaths(contentAbsDir, page.slug, useDirParser, languages);

      for (const mdxPath of targets) {
        try {
          const content = await readFile(mdxPath, 'utf-8');
          const updated = upsertFrontmatter(content, fieldsToInject);
          if (updated !== content) {
            await writeFile(mdxPath, updated, 'utf-8');
          }
        } catch {
          // File does not exist yet — skip (will be created by generatePage)
        }
      }
    }
  }
}

/**
 * Resolve .mdx file paths for a given slug across all applicable locales.
 */
function resolveMdxPaths(
  contentAbsDir: string,
  slug: string,
  useDirParser: boolean,
  languages: string[]
): string[] {
  if (useDirParser) {
    // Dir parser: content/{lang}/{slug}.mdx for each language
    return languages.map((lang) => join(contentAbsDir, lang, `${slug}.mdx`));
  }
  // Dot parser: content/{slug}.mdx
  return [join(contentAbsDir, `${slug}.mdx`)];
}

/**
 * Upsert fields into MDX frontmatter. Only adds missing fields; never overwrites existing ones.
 *
 * Handles:
 * - No frontmatter → creates one with the injected fields
 * - Existing frontmatter missing some fields → adds only the missing ones
 * - All fields already present → returns original content unchanged
 */
function upsertFrontmatter(content: string, fields: Record<string, string>): string {
  const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    // No frontmatter — insert at the beginning
    const fieldLines = Object.entries(fields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    return `---\n${fieldLines}\n---\n\n${content}`;
  }

  // Parse existing frontmatter lines into a set of existing keys
  const existingContent = match[1] ?? '';
  const existingLines = existingContent.split('\n');
  const existingKeys = new Set<string>();
  for (const line of existingLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const keyMatch = trimmed.match(/^(\w[\w-]*)\s*:/);
      if (keyMatch?.[1]) existingKeys.add(keyMatch[1]);
    }
  }

  // Only inject fields that don't already exist
  const newFields = Object.entries(fields).filter(([key]) => !existingKeys.has(key));
  if (newFields.length === 0) return content; // All fields already present

  const newFieldLines = newFields.map(([key, value]) => `${key}: ${value}`).join('\n');

  // Insert new fields before the closing ---
  const insertionPoint = (match.index ?? 0) + match[0].length - 3;
  return `${content.slice(0, insertionPoint)}\n${newFieldLines}\n${content.slice(insertionPoint)}`;
}
