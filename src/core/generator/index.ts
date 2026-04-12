import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { isI18nEnabled } from '../config/schema.js';
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
  /** Absolute path to .openmanual/app */
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
            { path: 'app/api/search/route.ts', content: generateSearchRoute() },
          ]
        : [{ path: 'app/api/search/route.ts', content: generateSearchRoute() }]),
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
        content: generateSearchDialog(),
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
            { path: 'app/api/search/route.ts', content: generateSearchRoute() },
          ]
        : [{ path: 'app/api/search/route.ts', content: generateSearchRoute() }]),
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
        content: generateSearchDialog(),
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
 * 2. html 标签设置 lang={lang}
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
    <html lang={lang}>
      <body>
        <AppLayout>
          <AppProvider lang={lang}>{children}</AppProvider>
        </AppLayout>
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

  // Build sidebar config for tree restructuring (including icon names)
  const sidebar = config.sidebar;
  const hasSidebar = sidebar && sidebar.length > 0;

  // Collect all unique icon names from sidebar config
  const iconNames = new Set<string>();
  if (hasSidebar) {
    for (const g of sidebar ?? []) {
      if (g.icon) iconNames.add(g.icon);
      for (const p of g.pages) {
        if (p.icon) iconNames.add(p.icon);
      }
    }
  }
  const hasIcons = iconNames.size > 0;
  const iconNameList = [...iconNames];

  const sidebarConfigSnippet = hasSidebar
    ? `\nconst sidebarConfig = ${JSON.stringify(
        (sidebar ?? []).map((g) => ({
          group: g.group,
          icon: g.icon,
          collapsed: g.collapsed,
          pages: g.pages.map((p) => ({ slug: p.slug, icon: p.icon })),
        })),
        null,
        2
      )} as const;
`
    : '';

  // Generate lucide-react import statement
  const lucideImportLine = hasIcons
    ? `\nimport { ${iconNameList.join(', ')} } from 'lucide-react';`
    : '';

  // Generate iconMap mapping icon names to React elements
  const iconMapSnippet = hasIcons
    ? `\nconst iconMap = {${iconNameList.map((name) => `\n  ${name}: <${name} />,`).join('')}\n} as const;
`
    : '';

  // i18n 模式下需要传入 lang 参数
  const treeLine = hasSidebar
    ? hasIcons
      ? isI18n
        ? 'tree: restructureTree(source.getPageTree(lang), sidebarConfig, iconMap),'
        : 'tree: restructureTree(source.getPageTree(), sidebarConfig, iconMap),'
      : isI18n
        ? 'tree: restructureTree(source.getPageTree(lang), sidebarConfig),'
        : 'tree: restructureTree(source.getPageTree(), sidebarConfig),'
    : isI18n
      ? 'tree: source.getPageTree(lang),'
      : 'tree: source.getPageTree(),';

  const restructureTreeImport = hasSidebar
    ? "\nimport { restructureTree } from 'openmanual/utils/restructure-tree';"
    : '';

  // i18n 模式下的组件签名和 baseOptions 调用
  if (isI18n) {
    return `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';${restructureTreeImport}${lucideImportLine}
${sidebarConfigSnippet}${iconMapSnippet}

export default async function DocsLayoutWrapper({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;

  const docsOptions = {
    ...baseOptions(lang),
    ${treeLine}${githubLine}${linksLine}${footerLine}
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
import type { ReactNode } from 'react';${restructureTreeImport}${lucideImportLine}
${sidebarConfigSnippet}${iconMapSnippet}
const docsOptions = {
  ...baseOptions(),
  ${treeLine}${githubLine}${linksLine}${footerLine}
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
 * Generate meta.json (and meta.en.json in i18n mode) for each sidebar
 * group directory so that fumadocs displays the configured group name.
 */
async function generateMetaFiles(ctx: GenerateContext): Promise<void> {
  const sidebar = ctx.config.sidebar;
  if (!sidebar || sidebar.length === 0) return;

  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const isI18n = isI18nEnabled(ctx.config);

  for (const group of sidebar) {
    // Extract directory prefix from the first page slug that contains "/"
    const dirPrefix = group.pages
      .map((p) => p.slug)
      .find((slug) => slug.includes('/'))
      ?.split('/')[0];

    if (!dirPrefix) continue; // Root-level pages, no meta.json needed

    const dirPath = join(contentAbsDir, dirPrefix);

    // 生成默认语言的 meta.json
    const metaPath = join(dirPath, 'meta.json');
    try {
      await access(metaPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
      await writeFile(metaPath, `${JSON.stringify({ title: group.group }, null, 2)}\n`, 'utf-8');
    }

    // i18n 模式下生成 meta.en.json（如果不存在）
    if (isI18n) {
      const metaEnPath = join(dirPath, 'meta.en.json');
      try {
        await access(metaEnPath);
      } catch {
        await mkdir(dirPath, { recursive: true });
        // 初始使用原始 group 名称，用户可后续翻译为英文
        await writeFile(
          metaEnPath,
          `${JSON.stringify({ title: group.group }, null, 2)}\n`,
          'utf-8'
        );
      }
    }
  }
}
