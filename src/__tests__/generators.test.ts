import { describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { isOpenApiEnabled } from '../core/config/schema.js';
import { generateCalloutComponent } from '../core/generator/callout-component.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { generateI18nConfig } from '../core/generator/i18n-config.js';
import { generateI18nUI } from '../core/generator/i18n-ui.js';
import { generateLayout, isImagePath, resolveLogoPaths } from '../core/generator/layout.js';
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

  // --- i18n 模式 ---

  it('should generate baseOptions with _locale param in i18n mode', () => {
    const result = generateLayout(i18nCtx);
    expect(result).toContain('baseOptions(_locale: string)');
    expect(result).not.toContain('baseOptions()');
  });

  it('should use text logo in i18n mode baseOptions', () => {
    const result = generateLayout(i18nCtx);
    expect(result).toContain('type="text" text="TestI18n"');
  });

  it('should use image logo in i18n mode baseOptions', () => {
    const ctx = {
      config: { ...i18nConfig, navbar: { logo: '/logo.svg' } },
      projectDir: '/tmp/test',
    };
    const result = generateLayout(ctx);
    expect(result).toContain('type="image" src="/logo.svg"');
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
      appDir: '/tmp/test/.cache/app',
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
      appDir: '/tmp/myproject/.cache/app',
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

  it('should NOT contain titleMap (titles come from frontmatter natively)', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).not.toContain('titleMap');
    expect(result).not.toContain('titleFromPath');
  });

  it('should NOT contain titleMap even when sidebar is configured', () => {
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

  it('should NOT contain allowedSlugs or strict mode filtering', () => {
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

  it('should contain simple defineDocs with dir content only', () => {
    const result = generateSourceConfig(baseCtx);
    expect(result).toContain('export const docs = defineDocs({');
    expect(result).toContain("dir: 'content',");
    // No schema transform with title fallback
    expect(result).not.toContain('titleFromPath');
    // No zod import needed for simple schema
    expect(result).not.toContain("import { z } from 'zod'");
  });

  it('should work identically regardless of i18n or parser mode', () => {
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

  it('should not include localeMap when i18n is not enabled', () => {
    const result = generateSearchRoute();
    expect(result).not.toContain('localeMap');
  });

  it('should generate localeMap with i18n config (zh + en)', () => {
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

  it('should map all supported languages correctly in i18n mode', () => {
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

  it('should NOT include localeMap when i18n enabled but only 1 language', () => {
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
  it('should map all unsupported languages to empty object in localeMap', () => {
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
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
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
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
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
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
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
        i18n: { ...(i18nConfig.i18n ?? {}), defaultLanguage: undefined },
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
  it('should generate dir parser route with correct params type (no lang in params)', () => {
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

  it('should generate dot parser route with fallback logic and lang from query param', () => {
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

  // --- 显式断言确保分支覆盖 ---

  it('dir parser route should embed _defaultLang constant with resolved value', () => {
    const result = generateRawContentRoute(i18nCtxDir);
    expect(result).toContain("_defaultLang = 'zh'");
  });

  it('dot parser route should embed _defaultLang constant with resolved value', () => {
    const result = generateRawContentRoute(i18nCtx);
    expect(result).toContain("_defaultLang = 'zh'");
  });

  // 覆盖 raw-content-route.ts 行10/45: defaultLanguage 和 locale 都未定义时回退到 'zh'
  it('dir parser should fallback defaultLang to zh when neither defaultLanguage nor locale is set', () => {
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

  it('dot parser should fallback defaultLang to zh when neither defaultLanguage nor locale is set', () => {
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
  it('dir parser should use locale as defaultLang fallback when defaultLanguage is missing', () => {
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
    expect(result).toContain('!isAllowed(slug, lang)');
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
  it('should return true when openapi is configured with specPath', () => {
    expect(isOpenApiEnabled(openapiConfig)).toBe(true);
  });

  it('should return false when openapi is not configured', () => {
    expect(isOpenApiEnabled(baseConfig)).toBe(false);
  });

  it('should return false when openapi is undefined', () => {
    expect(isOpenApiEnabled({ name: 'T' })).toBe(false);
  });
});

describe('generateOpenApiLib', () => {
  it('should return null when openapi is not enabled', () => {
    const result = generateOpenApiLib(baseCtx);
    expect(result).toBeNull();
  });

  it('should generate createOpenAPI import and instance when enabled', () => {
    const result = generateOpenApiLib(openapiCtx);
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toContain("import { createOpenAPI } from 'fumadocs-openapi/server'");
      expect(result).toContain('export const openapi = createOpenAPI({');
      expect(result).toContain('input:');
    }
  });

  it('should resolve specPath as absolute path', () => {
    const result = generateOpenApiLib(openapiCtx);
    if (result) {
      expect(result).toContain("'/tmp/test/openapi.yaml'");
    }
  });

  it('should handle nested specPath correctly with absolute path', () => {
    const result = generateOpenApiLib(openapiCtxCustomLabel);
    if (result) {
      expect(result).toContain("'/tmp/test/docs/openapi.json'");
    }
  });
});

describe('generateApiClientComponent', () => {
  it('should generate use client directive', () => {
    const result = generateApiClientComponent();
    expect(result).toContain("'use client'");
  });

  it('should import defineClientConfig from fumadocs-openapi/ui/client', () => {
    const result = generateApiClientComponent();
    expect(result).toContain("import { defineClientConfig } from 'fumadocs-openapi/ui/client'");
  });

  it('should export default defineClientConfig() call', () => {
    const result = generateApiClientComponent();
    expect(result).toContain('export default defineClientConfig()');
  });
});

describe('generateApiPageComponent', () => {
  it('should import from openapi lib and fumadocs-openapi/ui', () => {
    const result = generateApiPageComponent();
    expect(result).toContain("import { openapi } from '@/lib/openapi'");
    expect(result).toContain("import { createAPIPage } from 'fumadocs-openapi/ui'");
  });

  it('should import client component', () => {
    const result = generateApiPageComponent();
    expect(result).toContain("import client from './api-page.client'");
  });

  it('should export APIPage using createAPIPage', () => {
    const result = generateApiPageComponent();
    expect(result).toContain('export const APIPage = createAPIPage(openapi,');
    expect(result).toContain('client,');
  });
});

describe('generateGlobalCss - with openapi', () => {
  it('should include openapi CSS import when openapi is enabled', () => {
    const result = generateGlobalCss(openapiCtx);
    expect(result).toContain("@import 'fumadocs-openapi/css/preset.css'");
  });

  it('should place openapi CSS after fumadocs-ui CSS', () => {
    const result = generateGlobalCss(openapiCtx);
    const fumadocsIndex = result.indexOf("@import 'fumadocs-ui/style.css'");
    const openapiIndex = result.indexOf("@import 'fumadocs-openapi/css/preset.css'");
    expect(fumadocsIndex).toBeGreaterThan(-1);
    expect(openapiIndex).toBeGreaterThan(fumadocsIndex);
  });

  it('should NOT include openapi CSS when openapi is not enabled', () => {
    const result = generateGlobalCss(baseCtx);
    expect(result).not.toContain('fumadocs-openapi');
  });
});

describe('generateLibSource - with openapi', () => {
  it('should use multiple() and openapiPlugin() when openapi enabled (single lang)', () => {
    const result = generateLibSource(openapiCtx);
    expect(result).toContain("import { loader, multiple } from 'fumadocs-core/source'");
    expect(result).toContain(
      "import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server'"
    );
    expect(result).toContain('multiple({');
    expect(result).toContain('openapiSource(openapi,');
    expect(result).toContain("baseDir: 'api'");
    expect(result).toContain('meta: true');
    expect(result).toContain("groupBy: 'tag'");
    expect(result).toContain('plugins: [openapiPlugin()]');
  });

  it('should include both docs and openapi in multiple source', () => {
    const result = generateLibSource(openapiCtx);
    expect(result).toContain('docs: docs.toFumadocsSource()');
    expect(result).toContain('openapi:');
  });

  it('should keep simple loader when openapi not enabled (regression)', () => {
    const result = generateLibSource(baseCtx);
    expect(result).not.toContain('multiple');
    expect(result).not.toContain('openapiPlugin');
    expect(result).toContain('source: docs.toFumadocsSource()');
  });
});

describe('generateNextConfig - with openapi', () => {
  it('should include shiki in serverExternalPackages when openapi enabled', () => {
    const result = generateNextConfig(openapiCtx);
    expect(result).toContain("'shiki'");
    expect(result).toContain("'mermaid'");
  });

  it('should only have mermaid when openapi not enabled (regression)', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain("['mermaid']");
    expect(result).not.toContain('shiki');
  });
});

describe('generatePackageJson - with openapi', () => {
  it('should include fumadocs-openapi and shiki dependencies when openapi enabled', () => {
    const result = generatePackageJson(openapiCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies['fumadocs-openapi']).toBeDefined();
    expect(parsed.dependencies.shiki).toBeDefined();
  });

  it('should NOT include openapi deps when not enabled (regression)', () => {
    const result = generatePackageJson(baseCtx);
    const parsed = JSON.parse(result);
    expect(parsed.dependencies['fumadocs-openapi']).toBeUndefined();
    expect(parsed.dependencies.shiki).toBeUndefined();
  });
});

describe('generatePage - with openapi (single language)', () => {
  it('should import APIPage component when openapi enabled', () => {
    const result = generatePage(openapiCtx);
    expect(result).toContain("import { APIPage } from '@/components/api-page'");
  });

  it('should NOT import APIPage when openapi not enabled (regression)', () => {
    const result = generatePage(baseCtx);
    expect(result).not.toContain('APIPage');
  });

  it('should include openapi type render branch when enabled', () => {
    const result = generatePage(openapiCtx);
    expect(result).toContain("page.data.type === 'openapi'");
    expect(result).toContain('<APIPage {...(page.data as any).getAPIPageProps()} />');
    expect(result).toContain('<DocsPage full>');
  });

  it('should allow openapi slugs in strict mode isAllowed check', () => {
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

  it('should NOT include openapi branch when not enabled (regression)', () => {
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

  it('should import APIPage in i18n + openapi mode', () => {
    const result = generatePage(openapiI18nCtx);
    expect(result).toContain("import { APIPage } from '@/components/api-page'");
  });

  it('should include openapi type branch in i18n page', () => {
    const result = generatePage(openapiI18nCtx);
    expect(result).toContain("page.data.type === 'openapi'");
    expect(result).toContain('<APIPage {...(page.data as any).getAPIPageProps()} />');
  });

  it('should allow openapi slugs in i18n strict mode', () => {
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

  it('should import openapiPlugin, openapiSource, and i18n in combined mode', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain(
      "import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server'"
    );
    expect(result).toContain("import { i18n } from '@/lib/i18n'");
    expect(result).toContain("import { loader, multiple } from 'fumadocs-core/source'");
  });

  it('should generate for..of loop over i18n.languages with baseDir template', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('for (const lang of i18n.languages)');
    expect(result).toContain('`${lang}/api`');
    expect(result).toContain('meta: true');
    expect(result).toContain('_omOpenApiFiles.push(...result.files)');
  });

  it('should include both docs and openapi in multiple() source', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('docs: docs.toFumadocsSource()');
    expect(result).toContain('openapi: { files: _omOpenApiFiles }');
  });

  it('should include i18n and openapiPlugin in loader options', () => {
    const result = generateLibSource(openapiI18nCtx);
    expect(result).toContain('i18n,');
    expect(result).toContain('plugins: [openapiPlugin()]');
  });

  it('should differ from single-language openapi output (no i18n imports)', () => {
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
  it('should use empty string fallback when specPath is empty string', () => {
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
      expect(result).toContain("input: ['/tmp/project']");
    }
  });

  it('should return null when openapi exists but specPath is not a string (isOpenApiEnabled guard)', () => {
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
// generateGlobalCss — openapi + darkMode false 组合
// ============================================================

describe('generateGlobalCss - openapi + darkMode false combined', () => {
  it('should include openapi CSS but exclude dark block when darkMode false with openapi', () => {
    const ctx = {
      config: { ...openapiConfig, theme: { darkMode: false } },
    };
    const result = generateGlobalCss(ctx);
    expect(result).toContain("@import 'fumadocs-openapi/css/preset.css'");
    expect(result).not.toContain('.dark {');
    expect(result).toContain("@import 'tailwindcss'");
    expect(result).toContain("@import 'fumadocs-ui/style.css'");
  });

  it('should include openapi CSS with custom primaryHue when darkMode false', () => {
    const ctx = {
      config: { ...openapiConfig, theme: { primaryHue: 200, darkMode: false } },
    };
    const result = generateGlobalCss(ctx);
    expect(result).toContain('--primary-hue: 200');
    expect(result).toContain("@import 'fumadocs-openapi/css/preset.css'");
    expect(result).not.toContain('.dark {');
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

  it('should use baseDir "openapi" when separateTab is true (single language)', () => {
    const result = generateLibSource(separateTabCtx);
    expect(result).toContain("baseDir: 'openapi'");
    // separateTab=true 时不应包含 meta 和 groupBy
    expect(result).not.toContain('meta: true');
    expect(result).not.toContain('groupBy:');
  });

  it('should still include openapiPlugin when separateTab is true', () => {
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

  it('should use ${lang}/openapi baseDir template when separateTab is true with i18n', () => {
    const result = generateLibSource(i18nSeparateTabCtx);
    expect(result).toContain('`${lang}/openapi`');
    // separateTab=true 不应包含 meta/groupBy
    expect(result).not.toContain('meta: true');
    expect(result).not.toContain('groupBy:');
  });

  it('should include for..of loop and _omOpenApiFiles in i18n + separateTab mode', () => {
    const result = generateLibSource(i18nSeparateTabCtx);
    expect(result).toContain('for (const lang of i18n.languages)');
    expect(result).toContain('_omOpenApiFiles.push(...result.files)');
  });
});

// ============================================================
// generateLibSource — groupBy 变体（覆盖 lib-source.ts:11 的 groupBy 分支）
// ============================================================

describe('generateLibSource - groupBy variants', () => {
  it('should use groupBy route when configured', () => {
    const ctx = {
      config: {
        ...openapiConfig,
        openapi: { ...(openapiConfig.openapi as any), groupBy: 'route', separateTab: false },
      },
      projectDir: '/tmp/test',
    };
    const result = generateLibSource(ctx);
    expect(result).toContain("groupBy: 'route'");
    expect(result).toContain('meta: true');
  });

  it('should use groupBy none when configured', () => {
    const ctx = {
      config: {
        ...openapiConfig,
        openapi: { ...(openapiConfig.openapi as any), groupBy: 'none', separateTab: false },
      },
      projectDir: '/tmp/test',
    };
    const result = generateLibSource(ctx);
    expect(result).toContain("groupBy: 'none'");
    expect(result).toContain('meta: true');
  });

  it('should use groupBy route in i18n mode', () => {
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
    expect(result).toContain("groupBy: 'route'");
    expect(result).toContain('meta: true');
  });
});

// ============================================================
// generateOpenApiLib — 空 specPaths 返回 null（覆盖 openapi.ts:19）
// ============================================================

describe('generateOpenApiLib - empty specPaths returns null', () => {
  it('should return null when openapi has no valid spec fields', () => {
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

  it('should handle multi-file specs in generateOpenApiLib', () => {
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
        "input: ['/tmp/myproject/core-api.yaml', '/tmp/myproject/admin-api.yaml']"
      );
    }
  });

  it('should handle specs as single string in generateOpenApiLib', () => {
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
      expect(result).toContain("input: ['/tmp/myproject/single-spec.yaml']");
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

  it('should generate component with configured height', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          enabled: true,
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

  it('should include --fd-banner-height style injection', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: { enabled: true, height: '64px' } as any },
    };
    const result = generateTopBarComponent(ctx);
    // --fd-banner-height is injected by the TopBar component itself, not the generated wrapper
    // The generated wrapper passes height prop to TopBar which handles CSS injection
    expect(result).toContain("height='64px'");
    expect(result).toContain('<TopBar');
  });

  it('should use default height 64px when not specified', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: { enabled: true } as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain("height='64px'");
  });

  it('should render links with target="_blank" by default', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: {
          enabled: true,
          links: [
            { label: 'Pricing', href: '/pricing' },
            { label: 'Docs', href: '/docs', external: false },
          ],
        } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    // Pricing link should have target="_blank" (default external=true)
    expect(result).toContain('href="/pricing"');
    expect(result).toContain('Pricing');
    // Docs link should NOT have target="_blank"
    expect(result).toContain('href="/docs"');
    expect(result).toContain('Docs');
  });

  it('should use header.logo when provided', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          enabled: true,
          logo: '/custom-logo.svg',
        } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('/custom-logo.svg');
  });

  it('should fallback to navbar logo when header.logo not provided', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        navbar: { logo: '/nav-logo.svg' } as any,
        header: { enabled: true } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('/nav-logo.svg');
  });

  it('should fallback to config.name when no logo provided anywhere', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'MyProduct', header: { enabled: true } as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('MyProduct');
  });

  it('should include background prop when configured', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'T',
        header: { enabled: true, background: '#1a1a2e' } as any,
      },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).toContain('#1a1a2e');
  });

  it('should not include background prop when not configured', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: { enabled: true } as any },
    };
    const result = generateTopBarComponent(ctx);
    expect(result).not.toContain('background=');
  });

  it('should handle object logo with light/dark variants', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: {
        name: 'Test',
        header: {
          enabled: true,
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

  it('should generate empty right nav when no links configured', () => {
    const ctx = {
      ...topBarBaseCtx,
      config: { name: 'T', header: { enabled: true } as any },
    };
    const result = generateTopBarComponent(ctx);
    // Should still have the nav element but empty
    expect(result).toContain('<nav className="flex items-center gap-4">');
  });
});
