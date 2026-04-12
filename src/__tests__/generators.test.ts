import { describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateCalloutComponent } from '../core/generator/callout-component.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { generateI18nConfig } from '../core/generator/i18n-config.js';
import { generateI18nUI } from '../core/generator/i18n-ui.js';
import { generateLayout, isImagePath, resolveLogoPaths } from '../core/generator/layout.js';
import { generateLibSource } from '../core/generator/lib-source.js';
import { generateMermaidComponent } from '../core/generator/mermaid-component.js';
import { generateMiddleware } from '../core/generator/middleware.js';
import { generateNextConfig } from '../core/generator/next-config.js';
import { generatePackageJson } from '../core/generator/package-json.js';
import { generatePage } from '../core/generator/page.js';
import { generatePageActionsComponent } from '../core/generator/page-actions-component.js';
import { generatePostcssConfig } from '../core/generator/postcss-config.js';
import { generateProvider, generateSearchDialog } from '../core/generator/provider.js';
import { generateRawContentRoute } from '../core/generator/raw-content-route.js';
import { generateSearchRoute } from '../core/generator/search-route.js';
import { generateSourceConfig } from '../core/generator/source-config.js';
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
  i18n: { ...i18nConfig.i18n!, parser: 'dir' },
};

const i18nCtx = { config: i18nConfig, projectDir: '/tmp/test' };
const i18nCtxDir = { config: i18nConfigDirParser, projectDir: '/tmp/test' };

describe('generateGlobalCss', () => {
  it('should use default primaryHue 213 when theme not set', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('--primary-hue: 213');
  });

  it('should use custom primaryHue when provided', () => {
    const ctx = { config: { ...baseConfig, theme: { primaryHue: 180 } } };
    const result = generateGlobalCss(ctx);
    expect(result).toContain('--primary-hue: 180');
  });

  it('should include tailwindcss and fumadocs imports', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain("@import 'tailwindcss'");
    expect(result).toContain("@import 'fumadocs-ui/style.css'");
  });

  it('should include @custom-variant dark for class-based dark mode', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('@custom-variant dark (&:is(.dark, .dark *))');
  });

  it('should place @custom-variant after fumadocs import', () => {
    const result = generateGlobalCss(baseCtx);
    const fumadocsIndex = result.indexOf("@import 'fumadocs-ui/style.css'");
    const variantIndex = result.indexOf('@custom-variant dark');
    expect(fumadocsIndex).toBeGreaterThan(-1);
    expect(variantIndex).toBeGreaterThan(fumadocsIndex);
  });
});

describe('generateGlobalCss - dark theme', () => {
  it('should generate .dark block by default when darkMode not set', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('.dark {');
    expect(result).toContain('--color-fd-background: hsl(30, 18%, 10%)');
    expect(result).toContain('--color-fd-foreground: hsl(35, 15%, 90%)');
  });

  it('should generate .dark block when darkMode is true', () => {
    const ctx = { config: { ...baseConfig, theme: { darkMode: true } } };
    const result = generateGlobalCss(ctx);
    expect(result).toContain('.dark {');
  });

  it('should not generate .dark block when darkMode is false', () => {
    const ctx = { config: { ...baseConfig, theme: { darkMode: false } } };
    const result = generateGlobalCss(ctx);
    expect(result).not.toContain('.dark {');
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

  it('should include all 17 fumadocs variables in .dark block', () => {
    const result = generateGlobalCss(baseCtx);
    const darkBlock = result.match(/\.dark \{[^}]+\}/s)?.[0];
    expect(darkBlock).toBeDefined();
    for (const variable of darkVariables) {
      expect(darkBlock).toContain(variable);
    }
    expect(darkVariables).toHaveLength(17);
  });

  it('should include dark gradient on body', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).toContain('.dark body {');
    expect(result).toContain('linear-gradient');
    expect(result).toContain('hsla(30, 30%, 15%, 0.4)');
  });

  it('should apply primaryHue and darkMode together', () => {
    const ctx = {
      config: { ...baseConfig, theme: { primaryHue: 180, darkMode: true } },
    };
    const result = generateGlobalCss(ctx);
    expect(result).toContain('--primary-hue: 180');
    expect(result).toContain('.dark {');
  });
});

describe('generateLayout', () => {
  it('should use logo text when navbar.logo is plain text', () => {
    const ctx = {
      config: { ...baseConfig, navbar: { logo: 'MyLogo' } },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('type="text" text="MyLogo"');
  });

  it('should generate image props when logo is an image path', () => {
    const ctx = {
      config: { ...baseConfig, navbar: { logo: '/logo.svg' } },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('type="image" src="/logo.svg" alt="Test"');
  });

  it('should fallback to name as text when logo not set', () => {
    const result = generateLayout(baseCtx);
    expect(result).toContain('type="text" text="Test"');
  });

  it('should generate srcLight and srcDark props when logo object has different paths', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
      },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('srcLight="/logo-light.svg"');
    expect(result).toContain('srcDark="/logo-dark.svg"');
  });

  it('should generate single src prop when logo object has same paths', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo.svg', dark: '/logo.svg' } },
      },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('type="image" src="/logo.svg"');
    expect(result).not.toContain('srcLight=');
    expect(result).not.toContain('srcDark=');
  });

  it('should import NavLogo from openmanual/components/nav-layout', () => {
    const result = generateLayout(baseCtx);
    expect(result).toContain("import { NavLogo } from 'openmanual/components/nav-layout'");
  });
});

describe('isImagePath', () => {
  it('should detect absolute paths as image paths', () => {
    expect(isImagePath('/logo.svg')).toBe(true);
    expect(isImagePath('/images/logo.png')).toBe(true);
  });

  it('should detect file extensions as image paths', () => {
    expect(isImagePath('logo.svg')).toBe(true);
    expect(isImagePath('logo.png')).toBe(true);
    expect(isImagePath('logo.jpg')).toBe(true);
    expect(isImagePath('logo.jpeg')).toBe(true);
    expect(isImagePath('logo.webp')).toBe(true);
  });

  it('should not detect plain text as image path', () => {
    expect(isImagePath('MyLogo')).toBe(false);
    expect(isImagePath('OpenManual')).toBe(false);
  });
});

describe('resolveLogoPaths', () => {
  it('should resolve string logo to same light and dark', () => {
    const result = resolveLogoPaths('/logo.svg');
    expect(result).toEqual({ light: '/logo.svg', dark: '/logo.svg' });
  });

  it('should resolve object logo to different light and dark', () => {
    const result = resolveLogoPaths({ light: '/logo-light.svg', dark: '/logo-dark.svg' });
    expect(result).toEqual({ light: '/logo-light.svg', dark: '/logo-dark.svg' });
  });
});

describe('generateLibSource', () => {
  it('should import from .source/server and use loader', () => {
    const result = generateLibSource(baseCtx);
    expect(result).toContain("from '@/.source/server'");
    expect(result).toContain("from 'fumadocs-core/source'");
  });

  it('should configure loader with baseUrl and source', () => {
    const result = generateLibSource(baseCtx);
    expect(result).toContain("baseUrl: '/'");
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateNextConfig', () => {
  it('should include output export when siteUrl is set and not dev mode', () => {
    const ctx = {
      config: { ...baseConfig, siteUrl: 'https://example.com' },
    };
    const result = generateNextConfig(ctx);
    expect(result).toContain("output: 'export'");
  });

  it('should not include output when siteUrl is not set', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).not.toContain("output: 'export'");
  });

  it('should not include output when siteUrl is set but dev mode is true', () => {
    const ctx = {
      config: { ...baseConfig, siteUrl: 'https://example.com' },
      dev: true,
    };
    const result = generateNextConfig(ctx);
    expect(result).not.toContain("output: 'export'");
  });

  it('should always set images.unoptimized to true', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain('unoptimized: true');
  });

  it('should include mermaid in serverExternalPackages', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain("serverExternalPackages: ['mermaid']");
  });

  it('should include rewrites for .md URLs in dev mode', () => {
    const result = generateNextConfig({ ...baseCtx, dev: true });
    expect(result).toContain('async rewrites()');
    expect(result).toContain("source: '/:path(.+)\\\\.md'");
    expect(result).toContain("destination: '/api/raw/:path'");
  });

  it('should not include rewrites in non-dev mode', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).not.toContain('async rewrites()');
    expect(result).not.toContain('rewrites');
  });
});

describe('generatePackageJson', () => {
  it('should produce valid JSON', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  it('should have correct name, type, and private fields', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('openmanual-app');
    expect(parsed.type).toBe('module');
    expect(parsed.private).toBe(true);
  });

  it('should include required scripts and dependencies', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.scripts.dev).toBe('next dev');
    expect(parsed.scripts.build).toBe('next build');
    expect(parsed.dependencies.next).toBeDefined();
    expect(parsed.dependencies.react).toBeDefined();
    expect(parsed.dependencies.tailwindcss).toBeDefined();
    expect(parsed.dependencies['fumadocs-core']).toBeDefined();
  });

  it('should include mermaid and next-themes dependencies', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.mermaid).toBeDefined();
    expect(parsed.dependencies['next-themes']).toBeDefined();
  });

  it('should use version range when openmanualRoot is not set', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toMatch(/^\^\d+\.\d+\.\d+/);
  });

  it('should use file: link when openmanualRoot and appDir are set', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/test',
      appDir: '/tmp/test/.openmanual/app',
      openmanualRoot: '/tmp/test',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('file:../..');
  });

  it('should compute correct relative path for file: link', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/myproject',
      appDir: '/tmp/myproject/.openmanual/app',
      openmanualRoot: '/tmp/myproject',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('file:../..');
  });

  it('should fall back to version when openmanualRoot is set but appDir is not', () => {
    const ctx = {
      config: baseConfig,
      projectDir: '/tmp/test',
      openmanualRoot: '/tmp/test',
    };
    const result = generatePackageJson(ctx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toMatch(/^\^\d+\.\d+\.\d+/);
  });

  it('should use __VERSION__ when defined', () => {
    vi.stubGlobal('__VERSION__', '1.0.0-test');
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies.openmanual).toBe('^1.0.0-test');
    vi.restoreAllMocks();
  });
});

describe('generatePage', () => {
  it('should import source and MDX components', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/lib/source'");
    expect(result).toContain("from 'fumadocs-ui/page'");
    expect(result).toContain("from 'fumadocs-ui/mdx'");
  });

  it('should import and register Mermaid component', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/mermaid'");
    expect(result).toContain('Mermaid');
  });

  it('should import and register Callout components', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/callout'");
    expect(result).toContain('Callout');
    expect(result).toContain('CalloutTitle');
    expect(result).toContain('CalloutDescription');
  });

  it('should export generateStaticParams', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain('export function generateStaticParams()');
    expect(result).toContain('source.generateParams()');
  });

  it('should include root path fallback in generateStaticParams', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain('p.slug.length === 0');
    expect(result).toContain('params.unshift');
    expect(result).toContain('...params[0]');
  });

  it('should include allowedSlugs filter in strict mode', () => {
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

  it('should not include allowedSlugs filter when contentPolicy is all', () => {
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

  it('should default to strict mode when contentPolicy is not set', () => {
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

  it('should generate correct isAllowed function with index fallback', () => {
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

  it('should import PageActions and use flex layout by default', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/components/page-actions'");
    expect(result).toContain('PageActions');
    expect(result).toContain('flex items-start justify-between');
    expect(result).toContain('data-content-area');
  });

  it('should not include PageActions when pageActions.enabled is false', () => {
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
  it('should include tailwindcss postcss plugin', () => {
    const result = generatePostcssConfig();
    expect(result).toContain("'@tailwindcss/postcss'");
  });
});

describe('generateProvider', () => {
  it('should have use client directive', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("'use client'");
  });

  it('should enable search by default', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain('enabled: true');
  });

  it('should disable search when config.search.enabled is false', () => {
    const ctx = {
      config: { ...baseConfig, search: { enabled: false } },
    };
    const result = generateProvider(ctx);
    expect(result).toContain('enabled: false');
  });

  it('should import RootProvider from fumadocs-ui/provider/next', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("import { RootProvider } from 'fumadocs-ui/provider/next'");
  });

  it('should import SafeSearchDialog from local components', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain("import SafeSearchDialog from './components/search-dialog'");
  });

  it('should export AppProvider', () => {
    const result = generateProvider(baseCtx);
    expect(result).toContain('export function AppProvider');
  });
});

describe('generateSearchDialog', () => {
  it('should have use client directive', () => {
    const result = generateSearchDialog();
    expect(result).toContain("'use client'");
  });

  it('should import from fumadocs-ui directly', () => {
    const result = generateSearchDialog();
    expect(result).toContain("from 'fumadocs-ui/components/dialog/search'");
    expect(result).toContain("from 'fumadocs-ui/contexts/i18n'");
    expect(result).toContain("from 'fumadocs-core/search/client'");
  });

  it('should export SafeSearchDialog as default', () => {
    const result = generateSearchDialog();
    expect(result).toContain('export default function SafeSearchDialog');
  });

  it('should include Array.isArray guard for safeItems', () => {
    const result = generateSearchDialog();
    expect(result).toContain('Array.isArray(query.data) ? query.data : defaultItems');
  });
});

describe('generateSourceConfig', () => {
  it('should define docs with content dir', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('defineDocs');
    expect(result).toContain("dir: 'content'");
  });

  it('should export defineConfig as default', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('export default defineConfig(');
    expect(result).toContain('fallbackLanguage');
  });

  it('should import and configure remarkMdxMermaid', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain("import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins'");
    expect(result).toContain('remarkPlugins: [remarkMdxMermaid]');
  });

  it('should generate empty titleMap when sidebar is not configured', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('const titleMap: Record<string, string> = {}');
  });

  it('should generate titleMap with slug-title pairs from sidebar config', () => {
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
          {
            group: '指南',
            pages: [{ slug: 'guide/intro', title: '指南介绍' }],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    expect(result).toContain("'index': '项目介绍'");
    expect(result).toContain("'quickstart': '快速上手'");
    expect(result).toContain("'guide/intro': '指南介绍'");
  });

  it('should escape single quotes in titles', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '测试',
            pages: [{ slug: 'test', title: "It's a test" }],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    expect(result).toContain("'test': 'It\\'s a test'");
  });

  it('should use titleFromPath that looks up titleMap first', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            pages: [{ slug: 'intro', title: '介绍' }],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    expect(result).toContain('titleMap[slug]');
    expect(result).toContain("slug.split('/').pop()");
  });

  it('should use indexOf to find content/ in path for titleMap lookup', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            pages: [
              { slug: 'index', title: '项目介绍' },
              { slug: 'guide/intro', title: '指南介绍' },
            ],
          },
        ],
      },
    };
    const result = generateSourceConfig(ctx);
    // titleFromPath must use indexOf('content/') to handle both relative and absolute paths
    expect(result).toContain("indexOf('content/')");
    expect(result).toContain("'content/'.length");
  });

  it('should include allowedSlugs and refine filter in strict mode', () => {
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
    const result = generateSourceConfig(ctx);
    expect(result).toContain('allowedSlugs');
    expect(result).toContain('.refine(');
    expect(result).toContain('allowedSlugs.has(slug)');
    expect(result).toContain('slugFromPath');
  });

  it('should not include allowedSlugs when contentPolicy is all', () => {
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
    const result = generateSourceConfig(ctx);
    expect(result).not.toContain('allowedSlugs');
    expect(result).not.toContain('.refine(');
  });

  it('should default to strict mode when contentPolicy is not set', () => {
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
    const result = generateSourceConfig(ctx);
    expect(result).toContain('allowedSlugs');
    expect(result).toContain('.refine(');
  });
});

describe('generateTsconfig', () => {
  it('should produce valid JSON', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  it('should have correct compiler options', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed.compilerOptions.target).toBe('ES2022');
    expect(parsed.compilerOptions.strict).toBe(true);
    expect(parsed.compilerOptions.jsx).toBe('react-jsx');
  });

  it('should configure paths alias', () => {
    const result = generateTsconfig();
    const parsed = JSON.parse(result);
    expect(parsed.compilerOptions.paths).toEqual({ '@/*': ['./*'] });
  });
});

describe('generateMermaidComponent', () => {
  it('should generate use client directive', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("'use client'");
  });

  it('should re-export Mermaid from openmanual/components/mermaid', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("export { Mermaid } from 'openmanual/components/mermaid'");
  });
});

describe('generateCalloutComponent', () => {
  it('should generate use client directive', () => {
    const result = generateCalloutComponent();
    expect(result).toContain("'use client'");
  });

  it('should re-export Callout components from openmanual/components/callout', () => {
    const result = generateCalloutComponent();
    expect(result).toContain(
      "export { Callout, CalloutTitle, CalloutDescription } from 'openmanual/components/callout'"
    );
  });
});

describe('generatePageActionsComponent', () => {
  it('should generate use client directive', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("'use client'");
  });

  it('should re-export PageActions from openmanual/components/page-actions', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("export { PageActions } from 'openmanual/components/page-actions'");
  });
});

describe('generateRawContentRoute', () => {
  it('should import readFile from node:fs/promises', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("import { readFile } from 'node:fs/promises'");
  });

  it('should import NextResponse from next/server', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("import { NextResponse } from 'next/server'");
  });

  it('should export GET handler', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain('export async function GET');
  });

  it('should try .mdx and .md extensions', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'.mdx'");
    expect(result).toContain("'.md'");
  });

  it('should return text/plain content type', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'Content-Type': 'text/plain; charset=utf-8'");
  });

  it('should return 404 when file not found', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('should read from content directory', () => {
    const result = generateRawContentRoute(baseCtx);
    expect(result).toContain("'content'");
  });
});

describe('generateSearchRoute', () => {
  it('should import source from @/lib/source', () => {
    const result = generateSearchRoute();
    expect(result).toContain("import { source } from '@/lib/source'");
  });

  it('should import createFromSource from fumadocs-core/search/server', () => {
    const result = generateSearchRoute();
    expect(result).toContain("import { createFromSource } from 'fumadocs-core/search/server'");
  });

  it('should export revalidate as false', () => {
    const result = generateSearchRoute();
    expect(result).toContain('export const revalidate = false');
  });

  it('should export staticGET as GET from createFromSource', () => {
    const result = generateSearchRoute();
    expect(result).toContain('export const { staticGET: GET } = createFromSource(source)');
  });

  it('should use source as argument to createFromSource', () => {
    const result = generateSearchRoute();
    expect(result).toMatch(/createFromSource\(source\)/);
  });
});

// ============================================================
// i18n 相关测试用例
// ============================================================

describe('generateI18nConfig', () => {
  it('should generate defineI18n config with dot parser (no parser field)', () => {
    const result = generateI18nConfig(i18nCtx);
    expect(result).toContain("import { defineI18n } from 'fumadocs-core/i18n'");
    expect(result).toContain("defaultLanguage: 'zh'");
    expect(result).toContain("languages: ['zh', 'en']");
    expect(result).not.toContain("parser: 'dir'");
  });

  it('should include parser: dir when parser is dir', () => {
    const result = generateI18nConfig(i18nCtxDir);
    expect(result).toContain("parser: 'dir'");
    expect(result).toContain("defaultLanguage: 'zh'");
    expect(result).toContain("languages: ['zh', 'en']");
  });

  it('should fallback defaultLanguage to config.locale', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...i18nConfig.i18n!, defaultLanguage: undefined },
        locale: 'ja',
      },
    };
    const result = generateI18nConfig(ctx);
    expect(result).toContain("defaultLanguage: 'ja'");
  });

  it('should fallback defaultLanguage to zh when neither set', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...i18nConfig.i18n!, defaultLanguage: undefined },
      },
    };
    const result = generateI18nConfig(ctx);
    expect(result).toContain("defaultLanguage: 'zh'");
  });

  it('should throw when i18n.enabled is false', () => {
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

  it('should throw when only 1 language configured', () => {
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

  it('should throw when i18n config is missing', () => {
    const ctx = { config: { name: 'T' } };
    expect(() => generateI18nConfig(ctx)).toThrow(
      /generateI18nConfig called but i18n is not properly configured/
    );
  });
});

describe('generateI18nUI', () => {
  it('should generate defineI18nUI with multiple language displayNames', () => {
    const result = generateI18nUI(i18nCtx);
    expect(result).toContain("import { defineI18nUI } from 'fumadocs-ui/i18n'");
    expect(result).toContain("'zh': {");
    expect(result).toContain("displayName: '中文'");
    expect(result).toContain("'en': {");
    expect(result).toContain("displayName: 'English'");
  });

  it('should work with single language', () => {
    const ctx = {
      config: { name: 'T', i18n: { languages: [{ code: 'ja', name: '日本語' }] } },
    };
    const result = generateI18nUI(ctx);
    expect(result).toContain("'ja': {");
    expect(result).toContain("displayName: '日本語'");
  });

  it('should correctly map three languages', () => {
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
    expect(result).toContain("'zh': {");
    expect(result).toContain("'en': {");
    expect(result).toContain("'ja': {");
  });

  it('should throw when languages array is empty', () => {
    const ctx = { config: { name: 'T', i18n: { languages: [] } } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });

  it('should throw when languages is undefined', () => {
    const ctx = { config: { name: 'T', i18n: { enabled: true } } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });

  it('should throw when i18n config is missing', () => {
    const ctx = { config: { name: 'T' } };
    expect(() => generateI18nUI(ctx)).toThrow(/generateI18nUI called but no languages configured/);
  });
});

describe('generateMiddleware', () => {
  it('should use i18n.defaultLanguage as defaultLanguage', () => {
    const result = generateMiddleware(i18nCtx);
    expect(result).toContain("const defaultLanguage = 'zh'");
  });

  it('should fallback to config.locale when defaultLanguage not set', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...i18nConfig.i18n!, defaultLanguage: undefined },
        locale: 'en',
      },
    };
    const result = generateMiddleware(ctx);
    expect(result).toContain("const defaultLanguage = 'en'");
  });

  it('should fallback to zh when neither defaultLanguage nor locale set', () => {
    const ctx = {
      config: {
        ...i18nConfig,
        i18n: { ...i18nConfig.i18n!, defaultLanguage: undefined },
      },
    };
    const result = generateMiddleware(ctx);
    expect(result).toContain("const defaultLanguage = 'zh'");
  });

  it('should contain complete middleware template structure', () => {
    const result = generateMiddleware(i18nCtx);
    expect(result).toContain('NextResponse.redirect');
    expect(result).toContain("pathname === '/'");
    expect(result).toContain('matcher');
    expect(result).toContain('_next/static');
  });
});

describe('generateRawContentRoute - i18n modes', () => {
  it('should generate dir parser route with lang param and content/{lang}/{slug} path', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    // dir parser: params include lang
    expect(result).toContain('{ path: string[]; lang: string }');
    // dir parser: file path uses content/{lang}/{slug}
    expect(result).toContain("'content', lang,");
    expect(result).toContain('${slug}${ext}');
    // dir parser: has defaultLang inline
    expect(result).toContain('const defaultLang');
    // dir parser: 404 handling
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('should generate dot parser route with fallback logic', () => {
    const result = generateRawContentRoute(i18nCtx);
    // dot parser: params include lang
    expect(result).toContain('{ path: string[]; lang: string }');
    // dot parser: suffix logic for non-default language
    expect(result).toContain('suffix = lang !== defaultLang');
    // dot parser: try with suffix first
    expect(result).toContain('${slug}${suffix}${ext}');
    // dot parser: fallback without suffix
    expect(result).toContain('${slug}${ext}');
    // dot parser: 404 handling
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('dot parser should try .mdx and .md extensions in order', () => {
    const result = generateRawContentRoute(i18nCtx);
    const mdxIndex = result.indexOf("'.mdx'");
    const mdIndex = result.indexOf("'.md'");
    expect(mdxIndex).toBeGreaterThan(-1);
    expect(mdIndex).toBeGreaterThan(mdxIndex);
  });

  it('dir parser should use correct file path pattern', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    // dir parser path: join(cwd(), 'content', lang, `${slug}.ext`)
    expect(result).toContain("'content', lang,");
  });

  it('dot parser should handle 404 after all extensions exhausted', () => {
    const result = generateRawContentRoute(i18nCtx);
    // 404 should be outside both extension loops
    const last404 = result.lastIndexOf("'Not found'");
    expect(last404).toBeGreaterThan(-1);
    expect(result.indexOf('status: 404')).toBeGreaterThan(last404 - 20);
  });

  it('dir parser should handle 404 after all extensions exhausted', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });
});

describe('generatePage - i18n mode', () => {
  it('should generate i18n page with lang param in Page signature', () => {
    const result = generatePage(i18nCtx);
    // i18n page: params includes lang
    expect(result).toContain('{ slug?: string[]; lang: string }');
    // i18n page: getPage takes (slug, lang)
    expect(result).toMatch(/getPage\(slug,\s*lang\)/);
    // i18n page: exports generateStaticParams
    expect(result).toContain('export function generateStaticParams()');
  });

  it('should include allowedSlugs and isAllowed in strict i18n mode', () => {
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
    expect(result).toContain('!isAllowed(slug)');
    expect(result).toContain('params.filter');
  });

  it('should not include allowedSlugs when contentPolicy is all in i18n mode', () => {
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

  it('should import PageActions and use flex layout by default in i18n mode', () => {
    const result = generatePage(i18nCtx);
    expect(result).toContain("from '@/components/page-actions'");
    expect(result).toContain('PageActions');
    expect(result).toContain('flex items-start justify-between');
  });

  it('should not include PageActions when disabled in i18n mode', () => {
    const ctx = {
      config: { ...i18nConfig, pageActions: { enabled: false } },
    };
    const result = generatePage(ctx);
    expect(result).not.toContain("from '@/components/page-actions'");
    expect(result).not.toContain('PageActions');
    expect(result).not.toContain('flex items-start justify-between');
    expect(result).toContain('<DocsTitle>');
  });

  it('i18n staticParams filter should have lang in param type', () => {
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

  it('i18n strict mode should use slug.join and index fallback', () => {
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
  it('should import i18n and include i18n in loader config', () => {
    const result = generateLibSource(i18nCtx);
    expect(result).toContain("import { i18n } from '@/lib/i18n'");
    expect(result).toContain('i18n,');
  });

  it('should keep baseUrl and source in i18n mode', () => {
    const result = generateLibSource(i18nCtx);
    expect(result).toContain("baseUrl: '/'");
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateProvider - i18n mode', () => {
  it('should generate AppProvider with lang param and i18n prop', () => {
    const result = generateProvider(i18nCtx);
    // i18n provider: AppProvider accepts lang
    expect(result).toContain('{ children, lang }: { children: ReactNode; lang: string }');
    // i18n provider: passes i18nUI.provider(lang)
    expect(result).toContain('i18n={i18nUI.provider(lang)}');
    // imports i18nUI
    expect(result).toContain("import { i18nUI } from '@/lib/i18n-ui'");
  });

  it('should enable search by default in i18n mode', () => {
    const result = generateProvider(i18nCtx);
    expect(result).toContain('enabled: true');
  });

  it('should disable search when search.enabled is false in i18n mode', () => {
    const ctx = { config: { ...i18nConfig, search: { enabled: false } } };
    const result = generateProvider(ctx);
    expect(result).toContain('enabled: false');
  });

  it('i18n provider should differ from single-language provider', () => {
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
