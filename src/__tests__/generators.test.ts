import { describe, expect, it } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { generateLayout, isImagePath, resolveLogoPaths } from '../core/generator/layout.js';
import { generateLibSource } from '../core/generator/lib-source.js';
import { generateMermaidComponent } from '../core/generator/mermaid-component.js';
import { generateNextConfig } from '../core/generator/next-config.js';
import { generatePackageJson } from '../core/generator/package-json.js';
import { generatePage } from '../core/generator/page.js';
import { generatePageActionsComponent } from '../core/generator/page-actions-component.js';
import { generatePostcssConfig } from '../core/generator/postcss-config.js';
import { generateProvider } from '../core/generator/provider.js';
import { generateRawContentRoute } from '../core/generator/raw-content-route.js';
import { generateSourceConfig } from '../core/generator/source-config.js';
import { generateTsconfig } from '../core/generator/tsconfig.js';

const baseConfig: OpenManualConfig = { name: 'Test' };
const baseCtx = { config: baseConfig, projectDir: '/tmp/test' };

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
    expect(result).toContain("title: 'MyLogo'");
  });

  it('should generate img tag when logo is an image path', () => {
    const ctx = {
      config: { ...baseConfig, navbar: { logo: '/logo.svg' } },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('<img src="/logo.svg"');
    expect(result).toContain('alt="Test"');
    expect(result).toContain("import type { ReactNode } from 'react'");
  });

  it('should fallback to name when logo not set', () => {
    const result = generateLayout(baseCtx);
    expect(result).toContain("title: 'Test'");
  });

  it('should generate two img tags with dark toggle when logo is object with different paths', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
      },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('src="/logo-light.svg"');
    expect(result).toContain('src="/logo-dark.svg"');
    expect(result).toContain('className="dark:hidden"');
    expect(result).toContain('className="hidden dark:block"');
    expect(result).toContain("import type { ReactNode } from 'react'");
  });

  it('should generate single img tag when logo object has same paths', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo.svg', dark: '/logo.svg' } },
      },
    };
    const result = generateLayout(ctx);
    expect(result).toContain('src="/logo.svg"');
    expect(result).not.toContain('dark:hidden');
    expect(result).not.toContain('hidden dark:block');
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
    const result = generateLibSource();
    expect(result).toContain("from '@/.source/server'");
    expect(result).toContain("from 'fumadocs-core/source'");
  });

  it('should configure loader with baseUrl and source', () => {
    const result = generateLibSource();
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

  it('should import mermaid dynamically via cachePromise', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("cachePromise('mermaid', () => import('mermaid'))");
  });

  it('should import useTheme from next-themes', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("from 'next-themes'");
    expect(result).toContain('useTheme');
  });

  it('should export Mermaid component', () => {
    const result = generateMermaidComponent();
    expect(result).toContain('export function Mermaid');
  });

  it('should include mounted state guard for SSG', () => {
    const result = generateMermaidComponent();
    expect(result).toContain('useState(false)');
    expect(result).toContain('setMounted(true)');
    expect(result).toContain('if (!mounted) return');
  });

  it('should include dark theme support', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("resolvedTheme === 'dark'");
    expect(result).toContain("'dark' : 'default'");
  });

  it('should include promise cache mechanism', () => {
    const result = generateMermaidComponent();
    expect(result).toContain('new Map');
    expect(result).toContain('cachePromise');
  });

  it('should include bindFunctions for interactive elements', () => {
    const result = generateMermaidComponent();
    expect(result).toContain('bindFunctions');
  });

  it('should include mermaid initialize with fontFamily and themeCSS', () => {
    const result = generateMermaidComponent();
    expect(result).toContain("fontFamily: 'inherit'");
    expect(result).toContain('themeCSS');
  });
});

describe('generatePageActionsComponent', () => {
  it('should generate use client directive', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("'use client'");
  });

  it('should export PageActions component', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('export function PageActions');
  });

  it('should include clipboard copy logic', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('navigator.clipboard.writeText');
    expect(result).toContain('article.innerText');
  });

  it('should query data-content-area element', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("document.querySelector<HTMLElement>('[data-content-area]')");
    expect(result).toContain("document.querySelector<HTMLElement>('article')");
  });

  it('should include copied state feedback', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('已复制');
    expect(result).toContain('复制全文');
    expect(result).toContain('setCopied(true)');
    expect(result).toContain('setCopied(false)');
  });

  it('should include click outside handler to close menu', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('handleClickOutside');
    expect(result).toContain("addEventListener('mousedown'");
    expect(result).toContain("removeEventListener('mousedown'");
  });

  it('should include inline cn utility for class merging', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('function cn(');
    expect(result).toContain('classes.filter(Boolean).join');
    expect(result).toContain('cn(');
    expect(result).not.toContain("from 'fumadocs-ui/utils/cn'");
  });

  it('should include dropdown menu with relative positioning', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('absolute right-0 top-full');
  });

  it('should generate split button with Copy page text and arrow toggle', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('Copy page');
    expect(result).toContain('Copied!');
    expect(result).toContain('w-px bg-fd-border');
    expect(result).toContain('ChevronDownIcon');
    expect(result).toContain('ChevronUpIcon');
  });

  it('should include dropdown menu with min-w-[280px]', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('min-w-[280px]');
  });

  it('should include two menu options with icons and descriptions', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('复制全文');
    expect(result).toContain('复制页面内容，适合 AI 工具使用');
    expect(result).toContain('查看原文');
    expect(result).toContain('查看原始 Markdown 源文件');
    expect(result).toContain('FileTextIcon');
  });

  it('should include view markdown functionality', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('handleViewMarkdown');
    expect(result).toContain('window.open');
    expect(result).toContain('.md');
  });

  it('should include getPageText helper function', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('function getPageText()');
  });

  it('should include all inline SVG icons', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain('CopyIcon');
    expect(result).toContain('CheckIcon');
    expect(result).toContain('ChevronDownIcon');
    expect(result).toContain('ChevronUpIcon');
    expect(result).toContain('FileTextIcon');
  });

  it('should include window.open for viewing raw markdown', () => {
    const result = generatePageActionsComponent();
    expect(result).toContain("window.open(mdUrl, '_blank')");
    expect(result).toContain("path === '/' ? '/index.md'");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: testing generated template literal
    expect(result).toContain('${path}.md');
  });

  it('should not include modal-related code', () => {
    const result = generatePageActionsComponent();
    expect(result).not.toContain('showMarkdownModal');
    expect(result).not.toContain('setShowMarkdownModal');
    expect(result).not.toContain('copiedMarkdown');
    expect(result).not.toContain('setCopiedMarkdown');
    expect(result).not.toContain('handleCopyFromModal');
    expect(result).not.toContain('CloseIcon');
    expect(result).not.toContain('bg-black/50');
    expect(result).not.toContain('z-[100]');
  });
});

describe('generateRawContentRoute', () => {
  it('should import readFile from node:fs/promises', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("import { readFile } from 'node:fs/promises'");
  });

  it('should import NextResponse from next/server', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("import { NextResponse } from 'next/server'");
  });

  it('should export GET handler', () => {
    const result = generateRawContentRoute();
    expect(result).toContain('export async function GET');
  });

  it('should try .mdx and .md extensions', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("'.mdx'");
    expect(result).toContain("'.md'");
  });

  it('should return text/plain content type', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("'Content-Type': 'text/plain; charset=utf-8'");
  });

  it('should return 404 when file not found', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("'Not found'");
    expect(result).toContain('status: 404');
  });

  it('should read from content directory', () => {
    const result = generateRawContentRoute();
    expect(result).toContain("'content'");
  });
});
