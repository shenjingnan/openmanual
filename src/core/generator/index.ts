import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import {
  isDirParser,
  isHeaderEnabled,
  isI18nEnabled,
  isOpenApiEnabled,
  isSeparateTabMode,
  resolveEffectiveLogo,
  resolveOpenApiSpecPaths,
} from '../config/schema.js';
import {
  collectSlugsFromMeta,
  type MetaGroupInfo,
  scanMetaFiles,
} from '../content/meta-scanner.js';
import { type ContentFile, scanContentDir } from '../content/scanner.js';
import { formatTitle } from '../content/tree.js';
import { generateCalloutComponent } from './callout-component.js';
import { jsLiteral } from './code-utils.js';
import { generateGlobalCss } from './global-css.js';
import { generateI18nConfig } from './i18n-config.js';
import { generateI18nUI } from './i18n-ui.js';
import { generateLayout, isImagePath, resolveLogoPaths, resolveNavLogoProps } from './layout.js';
import { generateLibSource } from './lib-source.js';
import { generateMermaidComponent } from './mermaid-component.js';
import { generateMiddleware } from './middleware.js';
import { generateNextConfig } from './next-config.js';
import {
  generateApiClientComponent,
  generateApiPageComponent,
  generateOpenApiLib,
} from './openapi.js';
import { generatePackageJson } from './package-json.js';
import { generatePage } from './page.js';
import { generatePageActionsComponent } from './page-actions-component.js';
import { generatePostcssConfig } from './postcss-config.js';
import { generateProvider, generateSearchDialog } from './provider.js';
import { generateRawContentRoute } from './raw-content-route.js';
import { generateSearchRoute } from './search-route.js';
import { generateSourceConfig } from './source-config.js';
import { generateTopBarComponent } from './top-bar.js';
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
  /** Meta groups with root: true — used to generate explicit Layout Tabs in DocsLayout */
  rootGroups?: Array<{ title: string; dirPath: string; url: string; urls: string[] }>;
}

export async function generateAll(ctx: GenerateContext): Promise<void> {
  const isI18n = isI18nEnabled(ctx.config);

  // === OpenAPI 规范文件校验 ===
  if (isOpenApiEnabled(ctx.config)) {
    const { access } = await import('node:fs/promises');
    const { extname, join } = await import('node:path');
    const supportedExts = ['.json', '.yaml', '.yml'];
    const specPaths = resolveOpenApiSpecPaths(ctx.config);

    for (const specPath of specPaths) {
      const absolutePath = join(ctx.projectDir, specPath);
      const ext = extname(absolutePath).toLowerCase();

      if (!supportedExts.includes(ext)) {
        throw new Error(
          `[openapi] 不支持的 OpenAPI 规范文件格式: "${ext}"（文件: ${specPath}）。支持的格式: ${supportedExts.join(', ')}`
        );
      }

      try {
        await access(absolutePath);
      } catch {
        throw new Error(
          `[openapi] OpenAPI 规范文件不存在: "${specPath}"。` +
            `请确认 "openapi.specs" 或 "openapi.specPath" 在 openmanual.json 中配置的路径正确。`
        );
      }
    }
  }

  // Pre-compute slugs for page generation (replaces collectConfiguredSlugs from sidebar)
  await computeAllSlugs(ctx);

  // 基础配置文件（两种模式共用）
  const isOApi = isOpenApiEnabled(ctx.config);

  // === OpenAPI 文件（条件性生成）===
  const openapiFiles: Array<{ path: string; content: string }> = [];
  if (isOApi) {
    const openapiLib = generateOpenApiLib(ctx);
    if (openapiLib) {
      openapiFiles.push({ path: 'lib/openapi.ts', content: openapiLib });
    }
    openapiFiles.push({
      path: 'components/api-page.client.tsx',
      content: generateApiClientComponent(),
    });
    openapiFiles.push({
      path: 'components/api-page.tsx',
      content: generateApiPageComponent(),
    });
  }

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

  // 顶部横条组件（条件性生成，在 i18n/单语言分支中分别注册正确路径）
  const headerEnabled = isHeaderEnabled(ctx.config);

  let files: Array<{ path: string; content: string }>;

  if (isI18n) {
    // === 多语言模式：[lang]/ 动态路由结构 ===
    files = [
      ...baseFiles,
      ...openapiFiles,
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
      ...(headerEnabled
        ? [{ path: 'app/[lang]/components/top-bar.tsx', content: generateTopBarComponent(ctx) }]
        : []),
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
      ...openapiFiles,
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
      ...(headerEnabled
        ? [{ path: 'app/components/top-bar.tsx', content: generateTopBarComponent(ctx) }]
        : []),
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
  // Resolution priority: config.logo > navbar.logo (legacy)
  const rawLogo =
    ctx.config.logo != null
      ? typeof ctx.config.logo === 'string'
        ? ctx.config.logo
        : { light: ctx.config.logo.light, dark: ctx.config.logo.dark }
      : ctx.config.navbar?.logo;

  if (rawLogo && typeof rawLogo === 'string' && isImagePath(rawLogo)) {
    await ensureLogoFile(ctx, rawLogo, 'light');
  } else if (rawLogo && typeof rawLogo === 'object') {
    const { light, dark } = resolveLogoPaths(rawLogo);
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
  const headerEnabled = isHeaderEnabled(config);

  const metadataExport = favicon
    ? `import type { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: '${favicon}',
  },
};

`
    : '';

  const topBarImport = headerEnabled ? "import { OmTopBar } from './components/top-bar';\n" : '';

  const topBarJsx = headerEnabled ? '<OmTopBar />\n      ' : '';

  return `${metadataExport}${topBarImport}import { AppLayout } from 'openmanual/components/app-layout';
import { AppProvider } from './provider';
import type { ReactNode } from 'react';
import '../global.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout>
      <AppProvider>${topBarJsx}{children}</AppProvider>
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
  const headerEnabled = isHeaderEnabled(config);

  const metadataExport = favicon
    ? `import type { Metadata } from 'next';

export const metadata: Metadata = {
  icons: {
    icon: '${favicon}',
  },
};

`
    : '';

  const topBarImport = headerEnabled ? "import { OmTopBar } from './components/top-bar';\n" : '';

  const topBarJsx = headerEnabled ? '<OmTopBar />\n      ' : '';

  return `${metadataExport}${topBarImport}import { AppLayout } from 'openmanual/components/app-layout';
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
      <AppProvider lang={lang}>${topBarJsx}{children}</AppProvider>
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
  const isOApi = isOpenApiEnabled(config);
  const rootGroups = ctx.rootGroups;
  const isHeaderSearch = config.search?.position === 'header';

  // 解析有效 logo：判断是否需要在侧边栏显示
  const { source: logoSource, position: logoPosition } = resolveEffectiveLogo(config);
  const hasSidebarLogo = logoSource !== undefined && logoPosition === 'sidebar';
  const sidebarLogoImport = hasSidebarLogo
    ? "\nimport { NavLogo } from 'openmanual/components/nav-layout';"
    : '';
  const sidebarLogoProps = hasSidebarLogo ? resolveNavLogoProps(logoSource!, config.name) : null;
  // nav.title 只在有图片 logo 时添加（通过 navTitle slot 渲染，在 searchTrigger 之前）
  const navTitleLine =
    hasSidebarLogo && sidebarLogoProps && !sidebarLogoProps.includes('type="text"')
      ? `\n    title: <NavLogo ${sidebarLogoProps} />,`
      : '';

  const linksArray = navLinks.map((l) => ({
    text: l.label,
    url: l.href,
    external: true,
  }));

  const githubLine = githubLink ? `\n    github: '${githubLink}',` : '';

  const linksLine = linksArray.length > 0 ? `\n    links: ${JSON.stringify(linksArray)},` : '';

  const footerLine = footerText ? `\n  footer: { children: ${jsLiteral(footerText)} },` : '';

  // description：i18n 模式下从当前语言首页 frontmatter 动态获取，单语言模式使用配置值
  const configDesc = config.description ?? '';
  const descLine = configDesc ? (isI18n ? '' : `description: ${jsLiteral(configDesc)},`) : '';

  // Fumadocs reads title/icon/defaultOpen/pages from meta.json and icon from frontmatter natively.
  // No need for restructureTree() — use getPageTree() directly.
  const treeLine = isI18n ? 'tree: source.getPageTree(lang),' : 'tree: source.getPageTree(),';

  // Generate explicit sidebar.tabs from root groups so Layout Tabs are visible on all pages (including homepage).
  // Tab URLs use directory paths so isActive() prefix matching covers all pages in the group.
  // OpenAPI Tab 注入（仅在 separateTab 模式下注入独立 Tab；否则 API 页面混合到文档树中）
  const separateTab = isOpenApiEnabled(config) && isSeparateTabMode(config);
  const openapiTab = separateTab
    ? {
        title: config.openapi?.label ?? '接口文档',
        url: isI18n ? '/${lang}/openapi' : '/openapi',
        urls: new Set<string>(),
      }
    : null;

  const sidebarTabsLine =
    (rootGroups && rootGroups.length > 0) || openapiTab
      ? isI18n
        ? generateI18nSidebarTabs(config, rootGroups, openapiTab)
        : generateSingleSidebarTabs(config, rootGroups, openapiTab)
      : '';

  // i18n 模式下的组件签名和 baseOptions 调用
  if (isI18n) {
    const configDescSnippet = configDesc
      ? `\nconst configDescription = ${jsLiteral(configDesc)} as const;\n`
      : '';

    return `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';${sidebarLogoImport}${configDescSnippet}
export default async function DocsLayoutWrapper({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
${
  isOApi && separateTab
    ? `  const _omFirstApi = source.getPages(lang)?.find((p: any) => p.data?.type === 'openapi');
  const _omApiUrl = _omFirstApi?.url ?? \`/\${lang}/openapi\`;
`
    : ''
}${
  configDesc
    ? `
  const indexPage = source.getPage([], lang);
  const siteDescription = indexPage?.data.description ?? configDescription;`
    : ''
}

  const docsOptions = {
    ...baseOptions(lang),
    ${treeLine}${sidebarTabsLine}${githubLine}${linksLine}${footerLine}${
      configDesc ? '\n    description: siteDescription,' : ''
    }${isHeaderSearch ? '\n    searchToggle: { enabled: false },' : ''}
    nav: {${navTitleLine} },
    sidebar: { collapsible: false
    },
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
import type { ReactNode } from 'react';${sidebarLogoImport}${
    isOApi && separateTab
      ? `
const _omFirstApi = source.getPages()?.find((p: any) => p.data?.type === 'openapi');
const _omApiUrl = _omFirstApi?.url ?? '/openapi';
`
      : ''
  }
const docsOptions = {
  ...baseOptions(),
  ${treeLine}${sidebarTabsLine}${githubLine}${linksLine}${footerLine}${descLine}${
    isHeaderSearch ? '\n  searchToggle: { enabled: false },' : ''
  }
  nav: {${navTitleLine} },
  sidebar: { collapsible: false
  },
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

/**
 * Generate i18n sidebar.tabs string.
 * Extracted from generateDocsLayout to avoid deeply nested template literals
 * that confuse the oxc parser when escaped backticks are involved.
 */
function generateI18nSidebarTabs(
  config: OpenManualConfig,
  rootGroups: GenerateContext['rootGroups'],
  openapiTab: { title: string; url: string; urls: Set<string> } | null
): string {
  const entries = (rootGroups ?? []).map((g) => ({
    title: g.title,
    dirPath: g.dirPath,
    url: g.url,
    urls: g.urls,
  }));
  const entriesJson = JSON.stringify(entries);

  const openapiTabLine = openapiTab
    ? `,\n        { title: ${jsLiteral(openapiTab.title)}, url: _omApiUrl, urls: new Set<string>() }`
    : '';

  // Build the generated code string piece by piece to keep each template literal shallow
  const homeTab = `{ title: ${jsLiteral(config.name)}, url: \`/\${lang}\` }`;
  const mapExpr = `(${entriesJson} as Array<{title:string;dirPath:string;url:string;urls:string[]}>).filter(g => g.dirPath.startsWith(\`\${lang}/\`)).map(g => ({ title: g.title, url: g.url, urls: new Set<string>(g.urls) }))`;

  return `\n    sidebar: {\n      tabs: [\n        ${homeTab},\n        ...${mapExpr}${openapiTabLine}\n      ],\n    },`;
}

/**
 * Generate single-language (non-i18n) sidebar.tabs string.
 * Uses template literal to preserve Set<string> for urls property.
 */
function generateSingleSidebarTabs(
  config: OpenManualConfig,
  rootGroups: GenerateContext['rootGroups'],
  openapiTab: { title: string; url: string; urls: Set<string> } | null
): string {
  const groupEntries = (rootGroups ?? [])
    .map((g) => {
      const urlsArr = JSON.stringify(g.urls);
      return `{ title: ${jsLiteral(g.title)}, url: ${jsLiteral(g.url)}, urls: new Set(${urlsArr}) }`;
    })
    .join(',\n        ');

  const openapiTabLine = openapiTab
    ? `,\n        { title: ${jsLiteral(openapiTab.title)}, url: _omApiUrl, urls: new Set<string>() }`
    : '';

  return `\n    sidebar: {\n      tabs: [\n        { title: ${jsLiteral(config.name)}, url: '/' },${groupEntries ? `\n        ${groupEntries}` : ''}${openapiTabLine}\n      ],\n    },`;
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
 * Also extracts root groups (meta.json with root: true) into ctx.rootGroups.
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
    // Also collect root-level file slugs (e.g. index.mdx, quickstart.mdx under {lang}/)
    // which are not covered by any meta.json pages field
    const allFiles = await scanContentDir(contentAbsDir);
    for (const file of allFiles) {
      // Root-level files: directly under {lang}/ (dir-parser: segments length == 2)
      // or directly under content/ (dot-parser: segments length == 1)
      const isRootLevel = useDirParser
        ? file.segments.length === 2 && languages.includes(file.segments[0]!)
        : file.segments.length === 1;
      if (isRootLevel) {
        ctx.allSlugs.add(file.slug);
      }
    }
    // Scan all directories to collect actual file slugs and enable urls Set generation.
    const scannedDirCache = new Map<string, ContentFile[]>();
    for (const group of metaGroups) {
      const dirAbsPath = join(contentAbsDir, group.dirPath);
      try {
        const dirFiles = await scanContentDir(dirAbsPath);
        scannedDirCache.set(group.dirPath, dirFiles);
        // Only add to allSlugs if group has no explicit pages (avoid duplicates)
        if (!group.pages || group.pages.length === 0) {
          for (const df of dirFiles) {
            ctx.allSlugs.add(`${group.dirPath}/${df.slug}`);
          }
        }
      } catch {
        // Directory may not exist or empty — skip
      }
    }
    // Extract groups with root: true for explicit Layout Tabs generation.
    // - url: first actual page (for navigation — avoids 404 on directory paths)
    // - urls: Set of all pages in the group (for isLayoutTabActive exact matching)
    ctx.rootGroups = metaGroups
      .filter((g) => g.root === true)
      .map((g) => {
        const cached = scannedDirCache.get(g.dirPath);
        const firstPage = g.pages?.[0] ?? cached?.[0]?.name ?? 'index';
        const allUrls = (cached ?? []).map((f) => `/${g.dirPath}/${f.name}` as string);
        return {
          title: g.title,
          dirPath: g.dirPath,
          url: `/${g.dirPath}/${firstPage}`,
          urls: allUrls,
        };
      });
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
 * Validate an existing meta.json file is readable.
 * Does NOT modify the file — all user-set fields (including "root") are preserved as-is.
 * Fumadocs reads meta.json directly via its own content source pipeline.
 */
async function enrichMetaFile(_group: MetaGroupInfo): Promise<void> {
  try {
    await readFile(_group.filePath, 'utf-8');
  } catch {
    // File unreadable - skip
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
