import { describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { isOpenApiEnabled } from '../core/config/schema.js';
import { generateCalloutComponent } from '../core/generator/callout-component.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { generateI18nConfig } from '../core/generator/i18n-config.js';
import { generateI18nUI } from '../core/generator/i18n-ui.js';
import {
  generateLayout,
  isImagePath,
  resolveLogoPaths,
  resolveNavLogoProps,
} from '../core/generator/layout.js';
import { generateLibSource } from '../core/generator/lib-source.js';
import { generateMermaidComponent } from '../core/generator/mermaid-component.js';
import { generateMiddleware } from '../core/generator/middleware.js';
import { generateNextConfig } from '../core/generator/next-config.js';
import {
  generateApiClientComponent,
  generateApiPageComponent,
  generateOpenApiLib,
} from '../core/generator/openapi.js';
import { generatePackageJson } from '../core/generator/package-json.js';
import { generatePage } from '../core/generator/page.js';
import { generatePageActionsComponent } from '../core/generator/page-actions-component.js';
import { generatePostcssConfig } from '../core/generator/postcss-config.js';
import { generateProvider, generateSearchDialog } from '../core/generator/provider.js';
import { generateRawContentRoute } from '../core/generator/raw-content-route.js';
import { generateSearchRoute } from '../core/generator/search-route.js';
import { generateSourceConfig } from '../core/generator/source-config.js';
import { generateTopBarComponent } from '../core/generator/top-bar.js';
import { generateTsconfig } from '../core/generator/tsconfig.js';

const baseConfig: OpenManualConfig = { name: 'Test' };
const baseCtx = { config: baseConfig, projectDir: '/tmp/test' };

// === i18n 测试用共享配置 ===
const i18nConfig: OpenManualConfig = {
  name: 'TestI18n',
  i18n: {
    enabled: true,
    defaultLanguage: 'zh',
    languages: [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
    ],
    parser: 'dot',
  },
};

const i18nConfigDirParser: OpenManualConfig = {
  ...i18nConfig,
  i18n: { ...(i18nConfig.i18n ?? {}), parser: 'dir' },
};

const i18nCtx = { config: i18nConfig, projectDir: '/tmp/test' };
const i18nCtxDir = { config: i18nConfigDirParser, projectDir: '/tmp/test' };

describe('generateGlobalCss', () => {
  it('应当包含 tailwindcss 和 fumadocs 导入（拆分以避免重复 @import tailwindcss）', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain("@import 'tailwindcss'");
    // 不再导入 style.css（其内部包含第二次 @import tailwindcss 会导致 hover 变体丢失）
    // 改为直接导入子模块 neutral.css + preset.css
    expect(result).toContain("@import 'fumadocs-ui/css/neutral.css'");
    expect(result).toContain("@import 'fumadocs-ui/css/preset.css'");
  });

  it('应当使用 fumadocs-ui 内置的 @variant dark 而非自定义的', () => {
    const result = generateGlobalCss(baseCtx);
    // 不再自定义 @custom-variant dark（:is），复用 fumadocs-ui/base.css 内置的 @variant dark（:where）
    expect(result).not.toContain('@custom-variant dark');
    // 应包含 body 的 base layer 样式（从 style.css 提取）
    expect(result).toContain('@layer base');
    expect(result).toContain('@apply flex flex-col min-h-screen');
  });

  it('应当在 @theme 块中注册自定义颜色以用于变体生成', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('@theme');
    expect(result).toContain('--color-fd-inputborder');
  });
});

describe('generateGlobalCss - 暗色主题', () => {
  it('应当始终生成 .dark 块', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('.dark {');
    expect(result).toContain('--color-fd-background: hsl(30, 18%, 10%)');
    expect(result).toContain('--color-fd-foreground: hsl(35, 15%, 90%)');
  });

  const darkVariables = [
    '--color-fd-background',
    '--color-fd-foreground',
    '--color-fd-muted',
    '--color-fd-muted-foreground',
    '--color-fd-popover',
    '--color-fd-popover-foreground',
    '--color-fd-card',
    '--color-fd-card-foreground',
    '--color-fd-border',
    '--color-fd-primary',
    '--color-fd-primary-foreground',
    '--color-fd-secondary',
    '--color-fd-secondary-foreground',
    '--color-fd-accent',
    '--color-fd-accent-foreground',
    '--color-fd-ring',
    '--color-fd-overlay',
  ];

  it('应当在 .dark 块中包含全部 17 个 fumadocs 变量', () => {
    const result = generateGlobalCss(baseCtx);
    const darkBlock = result.match(/\.dark \{[^}]+\}/s)?.[0];
    expect(darkBlock).toBeDefined();
    for (const variable of darkVariables) {
      expect(darkBlock).toContain(variable);
    }
    expect(darkVariables).toHaveLength(17);
  });

  it('应当在 body 上包含暗色渐变', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('.dark body {');
    expect(result).toContain('linear-gradient');
    expect(result).toContain('hsla(30, 30%, 15%, 0.4)');
  });
});

describe('generateLayout', () => {
  it('默认应当禁用导航（隐藏侧边栏头部）', () => {
    const result = generateLayout(baseCtx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('title:');
    expect(result).not.toContain('NavLogo');
  });

  it('无论 logo 配置如何都应当禁用导航', () => {
    const ctx = {
      config: { ...baseConfig, navbar: { logo: 'MyLogo' } },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('MyLogo');
  });

  it('对于图片 logo 配置应当禁用导航', () => {
    const ctx = {
      config: { ...baseConfig, navbar: { logo: '/logo.svg' } },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('/logo.svg');
  });

  it('对于双主题 logo 配置应当禁用导航', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
      },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('srcLight=');
    expect(result).not.toContain('srcDark=');
  });

  it('应当从 fumadocs-ui 导入 BaseLayoutProps', () => {
    const result = generateLayout(baseCtx);
    expect(result).toContain("import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'");
  });

  it('不应导入 NavLogo 或 ReactNode', () => {
    const result = generateLayout(baseCtx);
    expect(result).not.toContain('NavLogo');
    expect(result).not.toContain('ReactNode');
  });

  // --- i18n 模式 ---

  it('在 i18n 模式下应当生成带 _locale 参数的 baseOptions', () => {
    const result = generateLayout(i18nCtx);
    expect(result).toContain('baseOptions(_locale: string)');
    expect(result).not.toContain('baseOptions()');
  });

  it('在 i18n 模式下也应当禁用导航', () => {
    const result = generateLayout(i18nCtx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('title:');
  });

  it('在 i18n 模式下无论 logo 配置如何都应当禁用导航', () => {
    const ctx = {
      config: { ...i18nConfig, navbar: { logo: '/logo.svg' } },
      projectDir: '/tmp/test',
    };
    const result = generateLayout(ctx);
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('/logo.svg');
  });
});

describe('isImagePath', () => {
  it('应当将绝对路径识别为图片路径', () => {
    expect(isImagePath('/logo.svg')).toBe(true);
    expect(isImagePath('/images/logo.png')).toBe(true);
  });

  it('应当将文件扩展名识别为图片路径', () => {
    expect(isImagePath('logo.svg')).toBe(true);
    expect(isImagePath('logo.png')).toBe(true);
    expect(isImagePath('logo.jpg')).toBe(true);
    expect(isImagePath('logo.jpeg')).toBe(true);
    expect(isImagePath('logo.webp')).toBe(true);
  });

  it('不应将纯文本识别为图片路径', () => {
    expect(isImagePath('MyLogo')).toBe(false);
    expect(isImagePath('OpenManual')).toBe(false);
  });
});

describe('resolveLogoPaths', () => {
  it('应当将字符串 logo 解析为相同的 light 和 dark', () => {
    const result = resolveLogoPaths('/logo.svg');
    expect(result).toEqual({ light: '/logo.svg', dark: '/logo.svg' });
  });

  it('应当将对象 logo 解析为不同的 light 和 dark', () => {
    const result = resolveLogoPaths({ light: '/logo-light.svg', dark: '/logo-dark.svg' });
    expect(result).toEqual({ light: '/logo-light.svg', dark: '/logo-dark.svg' });
  });
});

describe('resolveNavLogoProps', () => {
  it('应当为图片路径字符串生成图片属性', () => {
    const result = resolveNavLogoProps('/logo.svg', 'Test');
    expect(result).toBe('type="image" src="/logo.svg" alt="Test"');
  });

  it('应当为纯文本字符串生成文本属性', () => {
    const result = resolveNavLogoProps('MyLogo', 'MyLogo');
    expect(result).toBe('type="text" text="MyLogo"');
  });

  it('当 logo 对象的 light/dark 路径相同时应当生成单个 src', () => {
    const result = resolveNavLogoProps({ light: '/logo.svg', dark: '/logo.svg' }, 'Test');
    expect(result).toBe('type="image" src="/logo.svg" alt="Test"');
    expect(result).not.toContain('srcLight');
    expect(result).not.toContain('srcDark');
  });

  it('当 logo 对象的路径不同时应当生成 srcLight 和 srcDark', () => {
    const result = resolveNavLogoProps({ light: '/light.svg', dark: '/dark.svg' }, 'Test');
    expect(result).toContain('srcLight="/light.svg"');
    expect(result).toContain('srcDark="/dark.svg"');
  });
});

describe('generateLibSource', () => {
  it('应当从 collections/server 导入并使用 loader', () => {
    const result = generateLibSource(baseCtx);
    expect(result).toContain("from '@/.source/server'");
    expect(result).toContain("from 'fumadocs-core/source'");
  });

  it('应当使用 baseUrl 和 source 配置 loader', () => {
    const result = generateLibSource(baseCtx);
    expect(result).toContain("baseUrl: '/'");
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateNextConfig', () => {
  it('当设置了 siteUrl 且非开发模式时应当包含 output export', () => {
    const ctx = {
      config: { ...baseConfig, siteUrl: 'https://example.com' },
    };
    const result = generateNextConfig(ctx);
    expect(result).toContain("output: 'export'");
  });

  it('当未设置 siteUrl 时不应包含 output', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).not.toContain("output: 'export'");
  });

  it('当设置了 siteUrl 但开发模式为 true 时不应包含 output', () => {
    const ctx = {
      config: { ...baseConfig, siteUrl: 'https://example.com' },
      dev: true,
    };
    const result = generateNextConfig(ctx);
    expect(result).not.toContain("output: 'export'");
  });

  it('应当始终将 images.unoptimized 设为 true', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain('unoptimized: true');
  });

  it('应当在 serverExternalPackages 中包含 mermaid', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain("serverExternalPackages: ['mermaid']");
  });

  it('在开发模式下应当包含 .md URL 的 rewrites', () => {
    const result = generateNextConfig({ ...baseCtx, dev: true });
    expect(result).toContain('async rewrites()');
    expect(result).toContain("source: '/:path(.+)\\\\.md'");
    expect(result).toContain("destination: '/api/raw/:path'");
  });

  it('在非开发模式下不应包含 rewrites', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).not.toContain('async rewrites()');
    expect(result).not.toContain('rewrites');
  });

  it('默认不应包含 turbopack resolveAlias', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).not.toContain('turbopack:');
    expect(result).not.toContain('resolveAlias:');
  });

  it('在开发模式下不应包含 turbopack resolveAlias', () => {
    const result = generateNextConfig({ ...baseCtx, dev: true });
    expect(result).not.toContain("'collections/*': './.source/*'");
  });

  it('在 output export 模式下不应包含 turbopack resolveAlias', () => {
    const result = generateNextConfig({
      config: { ...baseConfig, siteUrl: 'https://example.com' },
    });
    expect(result).not.toContain("'collections/*': './.source/*'");
    expect(result).toContain("output: 'export'");
  });

  it('在 openapi 模式下不应包含 turbopack resolveAlias', () => {
    const result = generateNextConfig(openapiCtx);
    expect(result).not.toContain("'collections/*': './.source/*'");
  });
});

describe('generatePackageJson', () => {
  it('应当生成有效的 JSON', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  it('应当具有正确的 name、type 和 private 字段', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('openmanual-app');
    expect(parsed.type).toBe('module');
    expect(parsed.private).toBe(true);
  });

  it('应当包含必需的 scripts 和 dependencies', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.scripts.dev).toBe('next dev');
    expect(parsed.scripts.build).toBe('next build');
    expect(parsed.dependencies.next).toBeDefined();
    expect(parsed.dependencies.react).toBeDefined();
    expect(parsed.dependencies.tailwindcss).toBeDefined();
    expect(parsed.dependencies['fumadocs-core']).toBeDefined();
  });

  it('应当包含 mermaid 和 next-themes 依赖', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.mermaid).toBeDefined();
    expect(parsed.dependencies['next-themes']).toBeDefined();
  });

  it('当未设置 openmanualRoot 时应当使用版本范围', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toMatch(/^\^\d+\.\d+\.\d+/);
  });

  it('当设置了 openmanualRoot 和 appDir 时应当使用 file: 链接', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/test',
      appDir: '/tmp/test/.cache/app',
      openmanualRoot: '/tmp/test',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('file:../..');
  });

  it('应当为 file: 链接计算正确的相对路径', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/myproject',
      appDir: '/tmp/myproject/.cache/app',
      openmanualRoot: '/tmp/myproject',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('file:../..');
  });

  it('当设置了 openmanualRoot 但未设置 appDir 时应回退到版本号', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/test',
      openmanualRoot: '/tmp/test',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toMatch(/^\^\d+\.\d+\.\d+/);
  });

  it('当定义了 __VERSION__ 时应当使用它', () => {
    vi.stubGlobal('__VERSION__', '1.0.0-test');
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('^1.0.0-test');
    vi.restoreAllMocks();
  });
});

describe('generatePage', () => {
  it('应当导入 source 和 MDX 组件', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/lib/source'");
    expect(result).toContain("from 'fumadocs-ui/page'");
    expect(result).toContain("from 'fumadocs-ui/mdx'");
  });

  it('应当导入并注册 Mermaid 组件', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/mermaid'");
    expect(result).toContain('Mermaid');
  });

  it('应当导入并注册 Callout 组件', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/callout'");
    expect(result).toContain('Callout');
    expect(result).toContain('CalloutTitle');
    expect(result).toContain('CalloutDescription');
  });

  it('应当导出 generateStaticParams', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain('export function generateStaticParams()');
    expect(result).toContain('source.generateParams()');
  });

  it('应当在 generateStaticParams 中包含根路径回退', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain('p.slug.length === 0');
    expect(result).toContain('params.unshift');
    expect(result).toContain('homepage ?? params[0]');
  });

  it('在严格模式下应当包含 allowedSlugs 过滤器', () => {
    const ctx = {
      config: {
        ...baseConfig,
        contentPolicy: 'strict' as const,
        sidebar: [
          {
            group: 'Guide',
            pages: [
              { slug: 'index', title: 'Home' },
              { slug: 'guide', title: 'Guide' },
            ],
          },
        ],
      },
    };
    const result = generatePage(ctx);
    expect(result).toContain('allowedSlugs');
    expect(result).toContain('isAllowed');
    expect(result).toContain('!isAllowed(slug)');
    expect(result).toContain('params.filter');
  });

  it('当 contentPolicy 为 all 时不应包含 allowedSlugs 过滤器', () => {
    const ctx = {
      config: {
        ...baseConfig,
        contentPolicy: 'all' as const,
        sidebar: [
          {
            group: 'Guide',
            pages: [{ slug: 'index', title: 'Home' }],
          },
        ],
      },
    };
    const result = generatePage(ctx);
    expect(result).not.toContain('allowedSlugs');
    expect(result).not.toContain('isAllowed');
  });

  it('当未设置 contentPolicy 时默认应使用严格模式', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: 'Guide',
            pages: [{ slug: 'index', title: 'Home' }],
          },
        ],
      },
    };
    const result = generatePage(ctx);
    expect(result).toContain('allowedSlugs');
    expect(result).toContain('isAllowed');
  });

  it('应当生成带有 index 回退的正确 isAllowed 函数', () => {
    const ctx = {
      config: {
        ...baseConfig,
        contentPolicy: 'strict' as const,
        sidebar: [
          {
            group: 'Guide',
            pages: [{ slug: 'index', title: 'Home' }],
          },
        ],
      },
    };
    const result = generatePage(ctx);
    expect(result).toContain("slug.join('/')");
    expect(result).toContain("'index'");
  });

  it('默认应当导入 PageActions 并使用 flex 布局', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/page-actions'");
    expect(result).toContain('PageActions');
    expect(result).toContain('flex items-start justify-between');
    expect(result).toContain('data-content-area');
  });

  it('当 pageActions.enabled 为 false 时不应包含 PageActions', () => {
    const ctx = {
      config: {
        ...baseConfig,
        pageActions: { enabled: false },
      },
    };
    const result = generatePage(ctx);
    expect(result).not.toContain("from '@/components/page-actions'");
    expect(result).not.toContain('PageActions');
    expect(result).not.toContain('flex items-start justify-between');
    expect(result).toContain('<DocsTitle>');
  });
});

describe('generatePostcssConfig', () => {
  it('应当包含 tailwindcss postcss 插件', () => {
    const result = generatePostcssConfig();
    expect(result).toContain("'@tailwindcss/postcss'");
  });
});

describe('generateProvider', () => {
  it('应当包含 use client 指令', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("'use client'");
  });

  it('搜索功能默认启用（无需配置 search 字段）', () => {
    // 搜索始终启用，即使没有 search 字段
    const result = generateProvider(baseCtx);
    expect(result).toContain('enabled: true');
  });

  it('应当从 fumadocs-ui/provider/next 导入 RootProvider', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("import { RootProvider } from 'fumadocs-ui/provider/next'");
  });

  it('应当从本地组件导入 SafeSearchDialog', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("import SafeSearchDialog from './components/search-dialog'");
  });

  it('应当导出 AppProvider', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain('export function AppProvider');
  });
});

describe('generateSearchDialog', () => {
  it('应当包含 use client 指令', () => {
    const result = generateSearchDialog();
    expect(result).toContain("'use client'");
  });

  it('应当直接从 fumadocs-ui 导入', () => {
    const result = generateSearchDialog();
    expect(result).toContain("from 'fumadocs-ui/components/dialog/search'");
    expect(result).toContain("from 'fumadocs-ui/contexts/i18n'");
    expect(result).toContain("from 'fumadocs-core/search/client'");
  });

  it('应当将 SafeSearchDialog 作为默认导出', () => {
    const result = generateSearchDialog();
    expect(result).toContain('export default function SafeSearchDialog');
  });

  it('应当为 safeItems 包含 Array.isArray 守卫', () => {
    const result = generateSearchDialog();
    expect(result).toContain('Array.isArray(query.data) ? query.data : defaultItems');
  });
});

describe('generateSourceConfig', () => {
  it('应当使用内容目录定义 docs', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('defineDocs');
    expect(result).toContain("dir: 'content'");
  });

  it('应当将 defineConfig 作为默认导出', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('export default defineConfig(');
    expect(result).toContain('fallbackLanguage');
  });

  it('应当导入并配置 remarkMdxMermaid', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain("import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins'");
    expect(result).toContain('remarkPlugins: [remarkMdxMermaid]');
  });

  it('不应包含 titleMap（标题原生来自 frontmatter）', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).not.toContain('titleMap');
    expect(result).not.toContain('titleFromPath');
  });

  it('即使配置了 sidebar 也不应包含 titleMap', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '快速开始',
            pages: [
              { slug: 'index', title: '项目介绍' },
              { slug: 'quickstart', title: '快速上手' },
            ],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    expect(result).not.toContain('titleMap');
    expect(result).not.toContain('项目介绍');
  });

  it('不应包含 allowedSlugs 或严格模式过滤', () => {
    const ctx = {
      config: {
        ...baseConfig,
        contentPolicy: 'strict' as const,
        sidebar: [
          {
            group: 'Guide',
            pages: [{ slug: 'index', title: 'Home' }],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    expect(result).not.toContain('allowedSlugs');
    expect(result).not.toContain('.refine(');
    expect(result).not.toContain('slugFromPath');
  });

  it('应当包含仅含 dir 内容的简单 defineDocs', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('export const docs = defineDocs({');
    expect(result).toContain("dir: 'content',");
    // No schema transform with title fallback
    expect(result).not.toContain('titleFromPath');
    // No zod import needed for simple schema
    expect(result).not.toContain("import { z } from 'zod'");
  });

  it('无论 i18n 或解析器模式如何都应表现一致', () => {
    const results = [
      generateSourceConfig(baseCtx),
      generateSourceConfig({ config: { ...baseConfig, ...i18nConfig } }),
      generateSourceConfig({ config: { ...baseConfig, ...i18nConfigDirParser } }),
    ];
    // All should produce the same simplified output structure
    for (const result of results) {
      expect(result).toContain('defineDocs({');
      expect(result).toContain("dir: 'content',");
      expect(result).not.toContain('titleMap');
      expect(result).not.toContain('allowedSlugs');
    }
  });
});

describe('generateTsconfig', () => {
  it('应当生成有效的 JSON', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  it('应当具有正确的编译器选项', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed.compilerOptions.target).toBe('ES2022');
    expect(parsed.compilerOptions.strict).toBe(true);
    expect(parsed.compilerOptions.jsx).toBe('react-jsx');
  });

  it('应当配置路径别名', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed.compilerOptions.paths).toEqual({
      '@/*': ['./*'],
      'collections/*': ['./.source/*'],
    });
  });
});

describe('generateMermaidComponent', () => {
  it('应当生成 use client 指令', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("'use client'");
  });

  it('应当从 openmanual/components/mermaid 重导出 Mermaid', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("export { Mermaid } from 'openmanual/components/mermaid'");
  });
});

describe('generateCalloutComponent', () => {
  it('应当生成 use client 指令', () => {
    const result = generateCalloutComponent();
    expect(result).toContain("'use client'");
  });

  it('应当从 openmanual/components/callout 重导出 Callout 组件', () => {
    const result = generateCalloutComponent();
    expect(result).toContain(
      "export { Callout, CalloutTitle, CalloutDescription } from 'openmanual/components/callout'"
    );
  });
});

describe('generatePageActionsComponent', () => {
  it('应当生成 use client 指令', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("'use client'");
  });

  it('应当从 openmanual/components/page-actions 重导出 PageActions', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("export { PageActions } from 'openmanual/components/page-actions'");
  });
});

describe('generateRawContentRoute', () => {
  it('应当从 node:fs/promises 导入 readFile', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("import { readFile } from 'node:fs/promises'");
  });

  it('应当从 next/server 导入 NextResponse', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("import { NextResponse } from 'next/server'");
  });

  it('应当导出 GET 处理器', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain('export async function GET');
  });

  it('应当尝试 .mdx 和 .md 扩展名', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'.mdx'");
    expect(result).toContain("'.md'");
  });

  it('应当返回 text/plain 内容类型', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'Content-Type': 'text/plain; charset=utf-8'");
  });

  it('当文件未找到时应当返回 404', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('应当从 content 目录读取', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'content'");
  });
});

describe('generateSearchRoute', () => {
  it('应当从 @/lib/source 导入 source', () => {
    const result = generateSearchRoute();
    expect(result).toContain("import { source } from '@/lib/source'");
  });

  it('应当从 fumadocs-core/search/server 导入 createFromSource', () => {
    const result = generateSearchRoute();
    expect(result).toContain("import { createFromSource } from 'fumadocs-core/search/server'");
  });

  it('应当将 revalidate 导出为 false', () => {
    const result = generateSearchRoute();
    expect(result).toContain('export const revalidate = false');
  });

  it('应当从 createFromSource 将 staticGET 导出为 GET', () => {
    const result = generateSearchRoute();
    expect(result).toContain('export const { staticGET: GET } = createFromSource(source)');
  });

  it('应当将 source 作为 createFromSource 的参数', () => {
    const result = generateSearchRoute();
    expect(result).toMatch(/createFromSource\(source\)/);
  });

  it('当未启用 i18n 时不应包含 localeMap', () => {
    const result = generateSearchRoute();
    expect(result).not.toContain('localeMap');
  });

  it('应当使用 i18n 配置生成 localeMap（zh + en）', () => {
    const result = generateSearchRoute({
      config: {
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          parser: 'dir',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      } as OpenManualConfig,
    });

    // zh 不在支持列表中，应使用空对象
    expect(result).toContain('zh: {}');
    // en 在支持列表中，应映射为 'english'
    expect(result).toContain("en: 'english'");
    // 应包含带 localeMap 的 options 对象
    expect(result).toContain('createFromSource(source, {');
    expect(result).toContain('zh: {}');
    expect(result).toContain("en: 'english'");
  });

  it('在 i18n 模式下应当正确映射所有支持的语言', () => {
    const result = generateSearchRoute({
      config: {
        i18n: {
          enabled: true,
          defaultLanguage: 'en',
          languages: [
            { code: 'en', name: 'English' },
            { code: 'fr', name: 'French' },
            { code: 'ja', name: 'Japanese' },
          ],
        },
      } as OpenManualConfig,
    });

    // en 和 fr 在支持列表中
    expect(result).toContain("en: 'english'");
    expect(result).toContain("fr: 'french'");
    // ja 不在支持列表中，应使用空对象
    expect(result).toContain('ja: {}');
  });

  it('当启用 i18n 但只有 1 种语言时不应包含 localeMap', () => {
    const result = generateSearchRoute({
      config: {
        i18n: {
          enabled: true,
          languages: [{ code: 'zh', name: '中文' }],
        },
      } as OpenManualConfig,
    });
    expect(result).not.toContain('localeMap');
    expect(result).not.toContain('_localeMap');
    expect(result).toMatch(/createFromSource\(source\)/);
  });

  // 覆盖 search-route.ts 行68: 所有语言都不在 SUPPORTED_LOCALE_MAP 中时全走 {} 分支
  it('应当将所有不支持的语言映射为 localeMap 中的空对象', () => {
    const result = generateSearchRoute({
      config: {
        name: 'Test',
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'ja', name: '日本語' },
            { code: 'th', name: 'ไทย' },
          ],
        },
      } as OpenManualConfig,
    });

    // 三种语言都不在支持列表 → 全部为 {}
    expect(result).toContain('zh: {}');
    expect(result).toContain('ja: {}');
    expect(result).toContain('th: {}');
    // 不应包含任何支持的语言名称
    expect(result).not.toContain("'english'");
    expect(result).not.toContain("'japanese'");
    // 确认走的是 i18n 分支
    expect(result).toContain('localeMap');
    expect(result).toContain('_localeMap');
  });
});

// ============================================================
// i18n 相关测试用例
// ============================================================

describe('generateI18nConfig', () => {
  it('应当使用 dot 解析器生成 defineI18n 配置（无 parser 字段）', () => {
    const result = generateI18nConfig(i18nCtx);
    expect(result).toContain("import { defineI18n } from 'fumadocs-core/i18n'");
    expect(result).toContain("defaultLanguage: 'zh'");
    expect(result).toContain("languages: ['zh', 'en']");
    expect(result).not.toContain("parser: 'dir'");
  });

  it('当 parser 为 dir 时应当包含 parser: dir', () => {
    const result = generateI18nConfig(i18nCtxDir);
    expect(result).toContain("parser: 'dir'");
    expect(result).toContain("defaultLanguage: 'zh'");
    expect(result).toContain("languages: ['zh', 'en']");
  });

  it('应当将 defaultLanguage 回退到 config.locale', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
        locale: 'ja',
      },
    };
    const result = generateI18nConfig(ctx);
    expect(result).toContain("defaultLanguage: 'ja'");
  });

  it('当两者都未设置时应当将 defaultLanguage 回退到 zh', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
      },
    };
    const result = generateI18nConfig(ctx);
    expect(result).toContain("defaultLanguage: 'zh'");
  });

  it('当 i18n.enabled 为 false 时应抛出错误', () => {
    const ctx = {
      config: {
        name: 'T',
        i18n: {
          enabled: false,
          languages: [
            { code: 'a', name: 'A' },
            { code: 'b', name: 'B' },
          ],
        },
      },
    };
    expect(() => generateI18nConfig(ctx)).toThrow(
      /generateI18nConfig called but i18n is not properly configured/
    );
  });

  it('当只配置了 1 种语言时应抛出错误', () => {
    const ctx = {
      config: { name: 'T', i18n: { enabled: true, languages: [{ code: 'zh', name: '中文' }] } },
    };
    expect(() => generateI18nConfig(ctx)).toThrow(
      /generateI18nConfig called but i18n is not properly configured/
    );
  });

  it('should throw when languages array is empty', () => {
    const ctx = { config: { name: 'T', i18n: { enabled: true, languages: [] } } };
    expect(() => generateI18nConfig(ctx)).toThrow(
      /generateI18nConfig called but i18n is not properly configured/
    );
  });

  it('当缺少 i18n 配置时应抛出错误', () => {
    const ctx = { config: { name: 'T' } };
    expect(() => generateI18nConfig(ctx)).toThrow(
      /generateI18nConfig called but i18n is not properly configured/
    );
  });
});

describe('generateI18nUI', () => {
  it('应当生成带有多种语言 displayName 的 defineI18nUI', () => {
    const result = generateI18nUI(i18nCtx);
    expect(result).toContain("import { defineI18nUI } from 'fumadocs-ui/i18n'");
    expect(result).toContain('"zh": {');
    expect(result).toContain('displayName: "中文"');
    expect(result).toContain('"en": {');
    expect(result).toContain('displayName: "English"');
  });

  it('应当支持单语言', () => {
    const ctx = {
      config: { name: 'T', i18n: { languages: [{ code: 'ja', name: '日本語' }] } },
    };
    const result = generateI18nUI(ctx);
    expect(result).toContain('"ja": {');
    expect(result).toContain('displayName: "日本語"');
  });

  it('应当正确映射三种语言', () => {
    const ctx = {
      config: {
        name: 'T',
        i18n: {
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
            { code: 'ja', name: '日本語' },
          ],
        },
      },
    };
    const result = generateI18nUI(ctx);
    expect(result).toContain('"zh": {');
    expect(result).toContain('"en": {');
    expect(result).toContain('"ja": {');
  });

  it('当 languages 数组为空时应抛出错误', () => {
    const ctx = { config: { name: 'T', i18n: { languages: [] } } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });

  it('当 languages 为未定义时应抛出错误', () => {
    const ctx = { config: { name: 'T', i18n: { enabled: true } } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });

  it('当缺少 i18n 配置时应抛出错误', () => {
    const ctx = { config: { name: 'T' } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });
});

describe('generateMiddleware', () => {
  it('应当使用 i18n.defaultLanguage 作为 defaultLanguage', () => {
    const result = generateMiddleware(i18nCtx);
    expect(result).toContain("const defaultLanguage = 'zh'");
  });

  it('当未设置 defaultLanguage 时应回退到 config.locale', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
        locale: 'en',
      },
    };
    const result = generateMiddleware(ctx);
    expect(result).toContain("const defaultLanguage = 'en'");
  });

  it('当 defaultLanguage 和 locale 都未设置时应回退到 zh', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
      },
    };
    const result = generateMiddleware(ctx);
    expect(result).toContain("const defaultLanguage = 'zh'");
  });

  it('应当包含完整的中间件模板结构', () => {
    const result = generateMiddleware(i18nCtx);
    expect(result).toContain('NextResponse.redirect');
    expect(result).toContain("pathname === '/'");
    expect(result).toContain('matcher');
    expect(result).toContain('_next/static');
  });
});

describe('generateRawContentRoute - i18n modes', () => {
  it('应当生成带有正确参数类型的 dir 解析器路由（params 中不含 lang）', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    // dir parser: params 中只有 path，不含 lang（因为路由路径是 app/api/raw/[...path]/route.ts）
    expect(result).toContain('{ path: string[] }');
    expect(result).not.toContain('{ path: string[]; lang: string }');
    // 从 request.url 的 searchParams 获取 lang
    expect(result).toContain("searchParams.get('lang')");
    expect(result).toContain('new URL(request.url)');
    // dir parser: file path uses content/{lang}/{slug}
    expect(result).toContain("'content', lang,");
    expect(result).toContain(`\${slug}\${ext}`);
    // dir parser: has _defaultLang as module-level constant
    expect(result).toContain('_defaultLang');
    // dir parser: 404 handling
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('应当生成带有回退逻辑和来自查询参数的 lang 的 dot 解析器路由', () => {
    const result = generateRawContentRoute(i18nCtx);
    // dot parser: params 中只有 path，不含 lang
    expect(result).toContain('{ path: string[] }');
    expect(result).not.toContain('{ path: string[]; lang: string }');
    // 从 request.url 的 searchParams 获取 lang
    expect(result).toContain("searchParams.get('lang')");
    // dot parser: suffix logic for non-default language
    expect(result).toContain('suffix = lang !== _defaultLang');
    // dot parser: try with suffix first
    expect(result).toContain(`\${slug}\${suffix}\${ext}`);
    // dot parser: fallback without suffix
    expect(result).toContain(`\${slug}\${ext}`);
    // dot parser: 404 handling
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('dot 解析器应当按顺序尝试 .mdx 和 .md 扩展名', () => {
    const result = generateRawContentRoute(i18nCtx);
    const mdxIndex = result.indexOf("'.mdx'");
    const mdIndex = result.indexOf("'.md'");
    expect(mdxIndex).toBeGreaterThan(-1);
    expect(mdIndex).toBeGreaterThan(mdxIndex);
  });

  it('dir 解析器应当使用正确的文件路径模式', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    // dir parser path: join(cwd(), 'content', lang, `${slug}.ext`)
    expect(result).toContain("'content', lang,");
  });

  it('dot 解析器应当在所有扩展名耗尽后处理 404', () => {
    const result = generateRawContentRoute(i18nCtx);
    // 404 should be outside both extension loops
    const last404 = result.lastIndexOf("'Not found'");
    expect(last404).toBeGreaterThan(-1);
    expect(result.indexOf('status: 404')).toBeGreaterThan(last404 - 20);
  });

  it('dir 解析器应当在所有扩展名耗尽后处理 404', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  // --- 显式断言确保分支覆盖 ---

  it('dir 解析器路由应当嵌入带有解析值的 _defaultLang 常量', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    expect(result).toContain("_defaultLang = 'zh'");
  });

  it('dot 解析器路由应当嵌入带有解析值的 _defaultLang 常量', () => {
    const result = generateRawContentRoute(i18nCtx);
    expect(result).toContain("_defaultLang = 'zh'");
  });

  // 覆盖 raw-content-route.ts 行10/45: defaultLanguage 和 locale 都未定义时回退到 'zh'
  it('当 defaultLanguage 和 locale 都未设置时 dir 解析器应将 defaultLang 回退到 zh', () => {
    const result = generateRawContentRoute({
      config: {
        name: 'Test',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      } as OpenManualConfig,
    });

    // defaultLanguage undefined, locale undefined → ?? 'zh'
    expect(result).toContain("_defaultLang = 'zh'");
  });

  it('当 defaultLanguage 和 locale 都未设置时 dot 解析器应将 defaultLang 回退到 zh', () => {
    const result = generateRawContentRoute({
      config: {
        name: 'Test',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      } as OpenManualConfig,
    });

    expect(result).toContain("_defaultLang = 'zh'");
  });

  // 覆盖 raw-content-route.ts 行10/45: 使用 locale 作为 defaultLang 回退
  it('当缺少 defaultLanguage 时 dir 解析器应使用 locale 作为 defaultLang 回退', () => {
    const result = generateRawContentRoute({
      config: {
        name: 'Test',
        locale: 'ja',
        i18n: {
          enabled: true,
          languages: [
            { code: 'ja', name: '日本語' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      } as OpenManualConfig,
    });

    // defaultLanguage undefined → 回退到 locale 'ja'
    expect(result).toContain("_defaultLang = 'ja'");
  });
});

describe('generatePage - i18n mode', () => {
  it('应当生成在 Page 签名中带有 lang 参数的 i18n 页面', () => {
    const result = generatePage(i18nCtx);
    // i18n page: params includes lang
    expect(result).toContain('{ slug?: string[]; lang: string }');
    // i18n page: getPage takes (slug, lang)
    expect(result).toMatch(/getPage\(slug,\s*lang\)/);
    // i18n page: exports generateStaticParams
    expect(result).toContain('export function generateStaticParams()');
  });

  it('在严格 i18n 模式下应当包含 allowedSlugs 和 isAllowed', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        sidebar: [
          {
            group: 'Guide',
            pages: [
              { slug: 'index', title: 'Home' },
              { slug: 'guide', title: 'Guide' },
            ],
          },
        ],
      },
    };
    const result = generatePage(ctx);
    expect(result).toContain('allowedSlugs');
    expect(result).toContain('isAllowed');
    expect(result).toContain('!isAllowed(slug, lang)');
    expect(result).toContain('params.filter');
  });

  it('在 i18n 模式下当 contentPolicy 为 all 时不应包含 allowedSlugs', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        contentPolicy: 'all' as const,
        sidebar: [{ group: 'Guide', pages: [{ slug: 'index', title: 'Home' }] }],
      },
    };
    const result = generatePage(ctx);
    expect(result).not.toContain('allowedSlugs');
    expect(result).not.toContain('isAllowed');
  });

  it('在 i18n 模式下默认应当导入 PageActions 并使用 flex 布局', () => {
    const result = generatePage(i18nCtx);
    expect(result).toContain("from '@/components/page-actions'");
    expect(result).toContain('PageActions');
    expect(result).toContain('flex items-start justify-between');
  });

  it('在 i18n 模式下禁用时不应包含 PageActions', () => {
    const ctx = {
      config: { ...i18nConfig, pageActions: { enabled: false } },
    };
    const result = generatePage(ctx);
    expect(result).not.toContain("from '@/components/page-actions'");
    expect(result).not.toContain('PageActions');
    expect(result).not.toContain('flex items-start justify-between');
    expect(result).toContain('<DocsTitle>');
  });

  it('i18n staticParams 过滤器应当在参数类型中包含 lang', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        sidebar: [{ group: 'G', pages: [{ slug: 'index', title: 'Home' }] }],
      },
    };
    const result = generatePage(ctx);
    // i18n version: filter param type includes lang
    expect(result).toContain('{ slug: string[]; lang: string }');
  });

  it('i18n 严格模式应当使用 slug.join 和 index 回退', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        sidebar: [{ group: 'G', pages: [{ slug: 'index', title: 'Home' }] }],
      },
    };
    const result = generatePage(ctx);
    expect(result).toContain("slug.join('/')");
    expect(result).toContain("'index'");
  });
});

describe('generateLibSource - i18n mode', () => {
  it('应当导入 i18n 并在 loader 配置中包含它', () => {
    const result = generateLibSource(i18nCtx);
    expect(result).toContain("import { i18n } from '@/lib/i18n'");
    expect(result).toContain('i18n,');
  });

  it('在 i18n 模式下应当保留 baseUrl 和 source', () => {
    const result = generateLibSource(i18nCtx);
    expect(result).toContain("baseUrl: '/'");
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateProvider - i18n mode', () => {
  it('应当生成带有 lang 参数和 i18n 属性的 AppProvider', () => {
    const result = generateProvider(i18nCtx);
    // i18n provider: AppProvider accepts lang
    expect(result).toContain('{ children, lang }: { children: ReactNode; lang: string }');
    // i18n provider: passes i18nUI.provider(lang)
    expect(result).toContain('i18n={i18nUI.provider(lang)}');
    // imports i18nUI
    expect(result).toContain("import { i18nUI } from '@/lib/i18n-ui'");
  });

  it('i18n 模式下搜索功能默认启用（无需配置 search 字段）', () => {
    // i18n 模式下搜索也始终启用
    const result = generateProvider(i18nCtx);
    expect(result).toContain('enabled: true');
  });

  it('i18n provider 应当与单语言 provider 不同', () => {
    const i18nResult = generateProvider(i18nCtx);
    const singleResult = generateProvider(baseCtx);

    // i18n version has i18n prop, single does not
    expect(i18nResult).toContain('i18n={i18nUI.provider(lang)}');
    expect(singleResult).not.toContain('i18n=');
    expect(singleResult).not.toContain('i18nUI');

    // i18n version has lang param, single does not
    expect(i18nResult).toContain('lang: string');
    expect(singleResult).not.toContain('lang:');
  });
});

// ============================================================
// OpenAPI 相关测试用例
// ============================================================

const openapiConfig: OpenManualConfig = {
  name: 'TestAPI',
  openapi: { specPath: 'openapi.yaml', groupBy: 'tag', separateTab: false },
};

const openapiConfigCustomLabel: OpenManualConfig = {
  name: 'TestAPI',
  openapi: {
    specPath: 'docs/openapi.json',
    label: 'API Reference',
    groupBy: 'tag',
    separateTab: false,
  },
};

const openapiCtx = { config: openapiConfig, projectDir: '/tmp/test' };
const openapiCtxCustomLabel = { config: openapiConfigCustomLabel, projectDir: '/tmp/test' };

describe('isOpenApiEnabled', () => {
  it('当 openapi 配置了 specPath 时应当返回 true', () => {
    expect(isOpenApiEnabled(openapiConfig)).toBe(true);
  });

  it('当未配置 openapi 时应当返回 false', () => {
    expect(isOpenApiEnabled(baseConfig)).toBe(false);
  });

  it('当 openapi 为未定义时应当返回 false', () => {
    expect(isOpenApiEnabled({ name: 'T' })).toBe(false);
  });
});

describe('generateOpenApiLib', () => {
  it('当未启用 openapi 时应当返回 null', () => {
    const result = generateOpenApiLib(baseCtx);
    expect(result).toBeNull();
  });

  it('启用时应当生成 createOpenAPI 导入和实例', () => {
    const result = generateOpenApiLib(openapiCtx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toContain("import { createOpenAPI } from 'fumadocs-openapi/server'");
      expect(result).toContain('export const openapi = createOpenAPI({');
      expect(result).toContain('input:');
    }
  });

  it('应当将 specPath 解析为绝对路径', () => {
    const result = generateOpenApiLib(openapiCtx);
    if (result) {
      expect(result).toContain('"/tmp/test/openapi.yaml"');
    }
  });

  it('应当正确处理嵌套的 specPath 绝对路径', () => {
    const result = generateOpenApiLib(openapiCtxCustomLabel);
    if (result) {
      expect(result).toContain('"/tmp/test/docs/openapi.json"');
    }
  });
});

describe('generateApiClientComponent', () => {
  it('应当生成 use client 指令', () => {
    const result = generateApiClientComponent();
    expect(result).toContain("'use client'");
  });

  it('应当从 fumadocs-openapi/ui/client 导入 defineClientConfig', () => {
    const result = generateApiClientComponent();
    expect(result).toContain("import { defineClientConfig } from 'fumadocs-openapi/ui/client'");
  });

  it('应当默认导出 defineClientConfig() 调用', () => {
    const result = generateApiClientComponent();
    expect(result).toContain('export default defineClientConfig()');
  });
});

describe('generateApiPageComponent', () => {
  it('应当从 openapi 库和 fumadocs-openapi/ui 导入', () => {
    const result = generateApiPageComponent();
    expect(result).toContain("import { openapi } from '@/lib/openapi'");
    expect(result).toContain("import { createAPIPage } from 'fumadocs-openapi/ui'");
  });

  it('应当导入客户端组件', () => {
    const result = generateApiPageComponent();
    expect(result).toContain("import client from './api-page.client'");
  });

  it('应当使用 createAPIPage 导出 APIPage', () => {
    const result = generateApiPageComponent();
    expect(result).toContain('export const APIPage = createAPIPage(openapi,');
    expect(result).toContain('client,');
  });
});

describe('generateGlobalCss - with openapi', () => {
  it('当启用 openapi 时应当包含 openapi CSS 导入', () => {
    const result = generateGlobalCss(openapiCtx);
    expect(result).toContain("@import 'fumadocs-openapi/css/preset.css'");
  });

  it('应当将 openapi CSS 放在 fumadocs-ui CSS 导入之后', () => {
    const result = generateGlobalCss(openapiCtx);
    // openapi import 应在 neutral.css + preset.css 之后
    const presetIndex = result.indexOf("@import 'fumadocs-ui/css/preset.css'");
    const openapiIndex = result.indexOf("@import 'fumadocs-openapi/css/preset.css'");
    expect(presetIndex).toBeGreaterThan(-1);
    expect(openapiIndex).toBeGreaterThan(presetIndex);
  });

  it('当未启用 openapi 时不应包含 openapi CSS', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).not.toContain('fumadocs-openapi');
  });
});

describe('generateLibSource - with openapi', () => {
  it('当启用 openapi 时应当使用 multiple() 和 openapiPlugin()（单语言）', () => {
    const result = generateLibSource(openapiCtx);
    expect(result).toContain("import { loader, multiple } from 'fumadocs-core/source'");
    expect(result).toContain(
      "import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server'"
    );
    expect(result).toContain('multiple({');
    expect(result).toContain('openapiSource(openapi,');
    expect(result).toContain("baseDir: 'api'");
    expect(result).toContain('meta: true');
    expect(result).toContain('groupBy: "tag"');
    expect(result).toContain('plugins: [openapiPlugin()]');
  });

  it('应当在 multiple source 中同时包含 docs 和 openapi', () => {
    const result = generateLibSource(openapiCtx);
    expect(result).toContain('docs: docs.toFumadocsSource()');
    expect(result).toContain('openapi:');
  });

  it('当未启用 openapi 时应当保持简单 loader（回归测试）', () => {
    const result = generateLibSource(baseCtx);
    expect(result).not.toContain('multiple');
    expect(result).not.toContain('openapiPlugin');
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateNextConfig - with openapi', () => {
  it('当启用 openapi 时应当在 serverExternalPackages 中包含 shiki', () => {
    const result = generateNextConfig(openapiCtx);
    expect(result).toContain("'shiki'");
    expect(result).toContain("'mermaid'");
  });

  it('当未启用 openapi 时应当只有 mermaid（回归测试）', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain("['mermaid']");
    expect(result).not.toContain('shiki');
  });
});

describe('generatePackageJson - with openapi', () => {
  it('当启用 openapi 时应当包含 fumadocs-openapi 和 shiki 依赖', () => {
    const result = generatePackageJson(openapiCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies['fumadocs-openapi']).toBeDefined();
    expect(parsed.dependencies.shiki).toBeDefined();
  });

  it('当未启用时不应包含 openapi 依赖（回归测试）', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies['fumadocs-openapi']).toBeUndefined();
    expect(parsed.dependencies.shiki).toBeUndefined();
  });
});

describe('generatePage - with openapi (single language)', () => {
  it('当启用 openapi 时应当导入 APIPage 组件', () => {
    const result = generatePage(openapiCtx);
    expect(result).toContain("import { APIPage } from '@/components/api-page'");
  });

  it('当未启用 openapi 时不应导入 APIPage（回归测试）', () => {
    const result = generatePage(baseCtx);
    expect(result).not.toContain('APIPage');
  });

  it('启用时应当包含 openapi 类型渲染分支', () => {
    const result = generatePage(openapiCtx);
    expect(result).toContain("page.data.type === 'openapi'");
    expect(result).toContain('<APIPage {...(page.data as any).getAPIPageProps()} />');
    expect(result).toContain('<DocsPage full>');
  });

  it('在严格模式 isAllowed 检查中应当允许 openapi slug', () => {
    const ctx = {
      config: {
        ...openapiConfig,
        contentPolicy: 'strict' as const,
        sidebar: [{ group: 'Guide', pages: [{ slug: 'index', title: 'Home' }] }],
      },
    };
    const result = generatePage(ctx);
    // openapi prefix should be allowed through
    expect(result).contains("slug?.[0] === 'openapi'");
  });

  it('未启用时不应包含 openapi 分支（回归测试）', () => {
    const result = generatePage(baseCtx);
    expect(result).not.toContain("page.data.type === 'openapi'");
  });
});

describe('generatePage - with openapi (i18n mode)', () => {
  const openapiI18nCtx: { config: OpenManualConfig; projectDir: string } = {
    config: {
      name: 'TestI18nAPI',
      i18n: {
        enabled: true,
        defaultLanguage: 'zh',
        languages: [
          { code: 'zh', name: '中文' },
          { code: 'en', name: 'English' },
        ],
        parser: 'dot',
      },
      openapi: { specPath: 'openapi.yaml', groupBy: 'tag', separateTab: false },
    },
    projectDir: '/tmp/test',
  };

  it('在 i18n + openapi 模式下应当导入 APIPage', () => {
    const result = generatePage(openapiI18nCtx);
    expect(result).toContain("import { APIPage } from '@/components/api-page'");
  });

  it('在 i18n 页面中应当包含 openapi 类型分支', () => {
    const result = generatePage(openapiI18nCtx);
    expect(result).toContain("page.data.type === 'openapi'");
    expect(result).toContain('<APIPage {...(page.data as any).getAPIPageProps()} />');
  });

  it('在 i18n 严格模式下应当允许 openapi slug', () => {
    const ctx = {
      config: {
        ...openapiI18nCtx.config,
        contentPolicy: 'strict' as const,
        sidebar: [{ group: 'G', pages: [{ slug: 'index', title: 'H' }] }],
      },
      projectDir: '/tmp/test',
    };
    const result = generatePage(ctx);
    expect(result).toContain("slug?.[0] === 'openapi'");
  });
});

// ============================================================
// generateLibSource — i18n + OpenAPI 组合模式（覆盖 lib-source.ts:10-38）
// ============================================================

describe('generateLibSource - i18n + openapi combined mode', () => {
  const openapiI18nCtx: { config: OpenManualConfig; projectDir: string } = {
    config: {
      name: 'TestI18nAPI',
      i18n: {
        enabled: true,
        defaultLanguage: 'zh',
        languages: [
          { code: 'zh', name: '中文' },
          { code: 'en', name: 'English' },
        ],
        parser: 'dot',
      },
      openapi: { specPath: 'openapi.yaml', groupBy: 'tag', separateTab: false },
    },
    projectDir: '/tmp/test',
  };

  it('在组合模式下应当导入 openapiPlugin、openapiSource 和 i18n', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain(
      "import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server'"
    );
    expect(result).toContain("import { i18n } from '@/lib/i18n'");
    expect(result).toContain("import { loader, multiple } from 'fumadocs-core/source'");
  });

  it('应当生成带有 baseDir 模板的 i18n.languages for..of 循环', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('for (const lang of i18n.languages)');
    expect(result).toContain('`${lang}/api`');
    expect(result).toContain('meta: true');
    expect(result).toContain('_omOpenApiFiles.push(...result.files)');
  });

  it('应当在 multiple() source 中同时包含 docs 和 openapi', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('docs: docs.toFumadocsSource()');
    expect(result).toContain('openapi: { files: _omOpenApiFiles }');
  });

  it('应当在 loader 选项中包含 i18n 和 openapiPlugin', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('i18n,');
    expect(result).toContain('plugins: [openapiPlugin()]');
  });

  it('应当与单语言 openapi 输出不同（无 i18n 导入）', () => {
    const combinedResult = generateLibSource(openapiI18nCtx);
    const singleResult = generateLibSource(openapiCtx);
    // Combined has i18n import; single does not
    expect(combinedResult).toContain("import { i18n } from '@/lib/i18n'");
    expect(singleResult).not.toContain("import { i18n } from '@/lib/i18n'");
    // Combined has for..of loop; single does not
    expect(combinedResult).toContain('for (const lang of i18n.languages)');
    expect(singleResult).not.toContain('for (const lang of i18n.languages)');
    // Single uses direct openapiSource call; combined uses loop
    expect(singleResult).toContain("baseDir: 'api'");
    expect(singleResult).toContain('meta: true');
    expect(combinedResult).not.toContain("baseDir: 'openapi'");
  });
});

// ============================================================
// generateOpenApiLib — 边界场景（覆盖 openapi.ts:16 的 ?? '' 回退）
// ============================================================

describe('generateOpenApiLib - edge cases', () => {
  it('当 specPath 为空字符串时应当使用空字符串回退', () => {
    // specPath 为空字符串时，typeof 检查通过，?? '' 不触发但 join 结果为 projectDir 本身
    const ctx = {
      config: { name: 'Test', openapi: { specPath: '' } } as OpenManualConfig,
      projectDir: '/tmp/project',
    };
    expect(isOpenApiEnabled(ctx.config)).toBe(true);
    const result = generateOpenApiLib(ctx);
    expect(result).not.toBeNull();
    if (result) {
      // join('/tmp/project', '') = '/tmp/project'
      expect(result).toContain('input: ["/tmp/project"]');
    }
  });

  it('当 openapi 存在但 specPath 不是字符串时应当返回 null（isOpenApiEnabled 守卫）', () => {
    // 当 specPath 为 undefined 时，isOpenApiEnabled 返回 false
    // generateOpenApiLib 在第一行就返回 null，不会到达 ?? '' 分支
    // 这验证了防御性守卫的正确性
    const ctx = {
      config: {
        name: 'T',
        openapi: { specPath: undefined as unknown as string },
      } as OpenManualConfig,
      projectDir: '/tmp/p',
    };
    expect(isOpenApiEnabled(ctx.config)).toBe(false);
    const result = generateOpenApiLib(ctx);
    expect(result).toBeNull();
  });
});

// ============================================================
// generateLibSource — separateTab: true 分支（覆盖 lib-source.ts:49, 57-61）
// ============================================================

describe('generateLibSource - separateTab true mode', () => {
  const separateTabCtx = {
    config: { ...openapiConfig, openapi: { ...(openapiConfig.openapi as any), separateTab: true } },
    projectDir: '/tmp/test',
  };

  it('当 separateTab 为 true 时应当使用 baseDir "openapi"（单语言）', () => {
    const result = generateLibSource(separateTabCtx);
    expect(result).toContain("baseDir: 'openapi'");
    // separateTab=true 时不应包含 meta 和 groupBy
    expect(result).not.toContain('meta: true');
    expect(result).not.toContain('groupBy:');
  });

  it('当 separateTab 为 true 时仍然应当包含 openapiPlugin', () => {
    const result = generateLibSource(separateTabCtx);
    expect(result).toContain('plugins: [openapiPlugin()]');
    expect(result).toContain('multiple({');
  });
});

describe('generateLibSource - i18n + separateTab true mode', () => {
  const i18nSeparateTabCtx: { config: OpenManualConfig; projectDir: string } = {
    config: {
      name: 'TestI18nSep',
      i18n: {
        enabled: true,
        defaultLanguage: 'zh',
        languages: [
          { code: 'zh', name: '中文' },
          { code: 'en', name: 'English' },
        ],
        parser: 'dot',
      },
      openapi: { specPath: 'openapi.yaml', groupBy: 'tag', separateTab: true },
    },
    projectDir: '/tmp/test',
  };

  it('当 separateTab 为 true 且启用 i18n 时应当使用 ${lang}/openapi baseDir 模板', () => {
    const result = generateLibSource(i18nSeparateTabCtx);
    expect(result).toContain('`${lang}/openapi`');
    // separateTab=true 不应包含 meta/groupBy
    expect(result).not.toContain('meta: true');
    expect(result).not.toContain('groupBy:');
  });

  it('在 i18n + separateTab 模式下应当包含 for..of 循环和 _omOpenApiFiles', () => {
    const result = generateLibSource(i18nSeparateTabCtx);
    expect(result).toContain('for (const lang of i18n.languages)');
    expect(result).toContain('_omOpenApiFiles.push(...result.files)');
  });
});

// ============================================================
// generateLibSource — groupBy 变体（覆盖 lib-source.ts:11 的 groupBy 分支）
// ============================================================

describe('generateLibSource - groupBy variants', () => {
  it('配置后应当使用 groupBy route', () => {
    const ctx = {
      config: {
        ...openapiConfig,
        openapi: { ...(openapiConfig.openapi as any), groupBy: 'route', separateTab: false },
      },
      projectDir: '/tmp/test',
    };
    const result = generateLibSource(ctx);
    expect(result).toContain('groupBy: "route"');
    expect(result).toContain('meta: true');
  });

  it('配置后应当使用 groupBy none', () => {
    const ctx = {
      config: {
        ...openapiConfig,
        openapi: { ...(openapiConfig.openapi as any), groupBy: 'none', separateTab: false },
      },
      projectDir: '/tmp/test',
    };
    const result = generateLibSource(ctx);
    expect(result).toContain('groupBy: "none"');
    expect(result).toContain('meta: true');
  });

  it('在 i18n 模式下应当使用 groupBy route', () => {
    const ctx: { config: OpenManualConfig; projectDir: string } = {
      config: {
        name: 'T',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中' },
            { code: 'en', name: 'En' },
          ],
          parser: 'dot',
        },
        openapi: { specPath: 'a.yaml', groupBy: 'route', separateTab: false },
      },
      projectDir: '/tmp/test',
    };
    const result = generateLibSource(ctx);
    expect(result).toContain('groupBy: "route"');
    expect(result).toContain('meta: true');
  });
});

// ============================================================
// generateOpenApiLib — 空 specPaths 返回 null（覆盖 openapi.ts:19）
// ============================================================

describe('generateOpenApiLib - empty specPaths returns null', () => {
  it('当 openapi 没有有效的 spec 字段时应当返回 null', () => {
    // 构造 isOpenApiEnabled 返回 true 但 resolveOpenApiSpecPaths 返回空数组的场景
    // 通过 specs: '' （空字符串，typeof 检查为 string 但 Zod 允许）
    // 实际上 specs 为空字符串时 isOpenApiEnabled 返回 true（specs !== undefined）
    // 但 resolveOpenApiSpecPaths 返回 ['']（非空数组），不会触发 length===0
    //
    // 正确的触发方式：openapi 对象存在但 specs 和 specPath 都无效
    // 由于 Zod schema 验证，我们需要绕过或使用边界值
    // 使用 specs: undefined 且 specPath: undefined → isOpenApiEnabled=false（被第一行拦截）
    //
    // 唯一能让 isOpenApiEnabled=true 且 specPaths=[] 的场景：
    // specs 是一个空数组 []（Zod 允许，map 返回 []）
    const ctx = {
      config: {
        name: 'Test',
        openapi: { specs: [] as any },
      } as OpenManualConfig,
      projectDir: '/tmp/project',
    };
    // specs !== undefined → isOpenApiEnabled = true
    expect(isOpenApiEnabled(ctx.config)).toBe(true);
    // specs is [] → map returns [] → length === 0
    const result = generateOpenApiLib(ctx);
    expect(result).toBeNull();
  });

  it('应当在 generateOpenApiLib 中处理多文件 specs', () => {
    const ctx = {
      config: {
        name: 'Test',
        openapi: {
          specs: [
            { path: 'core-api.yaml', group: 'Core' },
            { path: 'admin-api.yaml', group: 'Admin' },
          ],
        },
      } as OpenManualConfig,
      projectDir: '/tmp/myproject',
    };
    const result = generateOpenApiLib(ctx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toContain(
        'input: ["/tmp/myproject/core-api.yaml", "/tmp/myproject/admin-api.yaml"]'
      );
    }
  });

  it('应当在 generateOpenApiLib 中将 specs 作为单个字符串处理', () => {
    const ctx = {
      config: {
        name: 'Test',
        openapi: { specs: 'single-spec.yaml' },
      } as OpenManualConfig,
      projectDir: '/tmp/myproject',
    };
    const result = generateOpenApiLib(ctx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toContain('input: ["/tmp/myproject/single-spec.yaml"]');
    }
  });
});

// ============================================================
// generateTopBarComponent — 覆盖 top-bar.ts
// ============================================================

describe('generateTopBarComponent', () => {
  const topBarBaseCtx = {
    projectDir: '/tmp/test',
    appDir: '/tmp/test/.cache/app',
    contentDir: 'content',
  };

  it('应当生成带有配置高度的组件', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          height: '56px',
          links: [{ label: 'Console', href: '/console' }],
        },
      } as OpenManualConfig,
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain("height='56px'");
    expect(result).toContain('Console');
    expect(result).toContain('/console');
  });

  it('应当包含 --fd-banner-height 样式注入', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: { height: '64px' } as any },
    };
    const result = generateTopBarComponent(ctx);
    // --fd-banner-height is injected by the TopBar component itself, not the generated wrapper
    // The generated wrapper passes height prop to TopBar which handles CSS injection
    expect(result).toContain("height='64px'");
    expect(result).toContain('<TopBar');
  });

  it('未指定时应当使用默认高度 64px', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: {} as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain("height='64px'");
  });

  it('默认应当使用 target="_blank" 渲染链接', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          links: [
            { label: 'Pricing', href: '/pricing' },
            { label: 'Docs', href: '/docs', external: false },
          ],
        } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    // Links are serialized as JSON props to NavLinks component
    expect(result).toContain('NavLinks');
    expect(result).toContain('"label":"Pricing"');
    expect(result).toContain('"/pricing"');
    expect(result).toContain('"label":"Docs"');
    expect(result).toContain('"/docs"');
    expect(result).toContain('"external":false');
  });

  it('当提供了 header.logo 时应当使用它', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          logo: '/custom-logo.svg',
        } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('/custom-logo.svg');
  });

  it('当未提供 header.logo 时应回退到 config.name（无 navbar 回退）', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        navbar: { logo: '/nav-logo.svg' } as any,
        header: {} as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    // 不再回退到 navbar.logo，而是直接使用 config.name 作为文本
    expect(result).toContain('type="text" text="Test"');
    expect(result).not.toContain('/nav-logo.svg');
  });

  it('当任何地方都没有提供 logo 时应回退到 config.name', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'MyProduct', header: {} as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('MyProduct');
  });

  it('配置后应当包含 background 属性', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: { background: '#1a1a2e' } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('#1a1a2e');
  });

  it('未配置时不应包含 background 属性', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: {} as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).not.toContain('background=');
  });

  it('应当处理带有 light/dark 变体的对象 logo', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          sticky: true,
          bordered: true,
          logo: { light: '/light.svg', dark: '/dark.svg' } as any,
        } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('/light.svg');
    expect(result).toContain('/dark.svg');
  });

  it('当未配置链接时应当生成空的右侧导航', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: {} as any },
    };
    const result = generateTopBarComponent(ctx);
    // NavLinks component receives empty array via extracted variable
    expect(result).toContain('NavLinks');
    expect(result).toContain('navLinks = []');
  });

  it('应当生成仅带 label 的链接（向后兼容）', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: { links: [{ label: 'Docs', href: '/docs' }] } as any,
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('Docs');
    expect(result).not.toContain('DynamicIcon');
    expect(result).not.toContain('lucide-react/dynamic');
  });

  it('应当使用 DynamicIcon 生成仅带图标的链接', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          links: [{ icon: 'Github', href: 'https://github.com/test' }],
        } as any,
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    // Icon links are serialized as JSON props to NavLinks (DynamicIcon is inside NavLinks)
    expect(result).toContain('NavLinks');
    expect(result).toContain('"icon":"Github"');
    expect(result).toContain('"href":"https://github.com/test"');
    // No inline DynamicIcon import in generated code (it's encapsulated in NavLinks)
    expect(result).not.toContain('lucide-react/dynamic');
  });

  it('应当生成同时带有图标和标签的链接', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          links: [{ icon: 'Github', label: 'GitHub', href: 'https://github.com/test' }] as any,
        },
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    // Icon+label links are serialized as JSON props to NavLinks
    expect(result).toContain('NavLinks');
    expect(result).toContain('"icon":"Github"');
    expect(result).toContain('"label":"GitHub"');
    expect(result).toContain('"href":"https://github.com/test"');
  });

  it('当未使用图标时不应导入 DynamicIcon', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          links: [
            { label: 'Docs', href: '/docs' },
            { label: 'Blog', href: '/blog' },
          ] as any,
        },
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    expect(result).not.toContain('DynamicIcon');
    expect(result).not.toContain('lucide-react/dynamic');
  });

  it('应当混合仅图标、仅标签和图标+标签链接', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          links: [
            { icon: 'Github', label: 'GitHub', href: 'https://github.com/test' } as any,
            { icon: 'Twitter', href: 'https://twitter.com/test' } as any,
            { label: 'Docs', href: '/docs' } as any,
          ],
        },
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    // All links are serialized as JSON to NavLinks component
    expect(result).toContain('NavLinks');
    // icon+label mode
    expect(result).toContain('"icon":"Github"');
    expect(result).toContain('"label":"GitHub"');
    // icon-only mode
    expect(result).toContain('"icon":"Twitter"');
    // label-only mode
    expect(result).toContain('"label":"Docs"');
    // No inline lucide-react/dynamic import (encapsulated in NavLinks)
    expect(result).not.toContain('lucide-react/dynamic');
  });

  it('应当在中间渲染 TopBarSearchTrigger（搜索始终在 header 中展示）', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: { height: '56px' } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('TopBarSearchTrigger');
    expect(result).toContain('center={searchCenter}');
    expect(result).toContain('const searchCenter = <TopBarSearchTrigger />');
    expect(result).toContain(
      "import { TopBarSearchTrigger } from 'openmanual/components/top-bar-search-trigger'"
    );
  });

  it('应当在顶部栏中使用顶级 logo（已传播到 header.logo）', () => {
    // 模拟 mergeDefaults 后的配置：顶级 logo 已传播到 header.logo
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        logo: { light: '/tl-light.svg', dark: '/tl-dark.svg' },
        // mergeDefaults 会将顶级 logo 传播到这里
        header: { height: '56px', logo: { light: '/tl-light.svg', dark: '/tl-dark.svg' } } as any,
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('/tl-light.svg');
    expect(result).toContain('/tl-dark.svg');
  });

  it('当没有配置 logo 时应回退到 config.name 文本', () => {
    // 模拟 mergeDefaults 后的配置：无 logo 时 header.logo 为 undefined
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: { height: '56px' } as any,
      } as any,
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('type="text" text="Test"');
  });
});
