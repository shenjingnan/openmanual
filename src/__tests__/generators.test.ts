import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { isImagePath, resolveLogoPaths } from '../core/generator/layout.js';
import { generateNextConfig } from '../core/generator/next-config.js';
import { generateOpenManualConfig } from '../core/generator/openmanual-config.js';
import { generatePackageJson } from '../core/generator/package-json.js';
import { generateSourceConfig } from '../core/generator/source-config.js';
import { generateTsconfig } from '../core/generator/tsconfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

describe('generateOpenManualConfig', () => {
  it('should export config as const', () => {
    const ctx = { config: baseConfig, projectDir: '/tmp/test' };
    const result = generateOpenManualConfig(ctx as Parameters<typeof generateOpenManualConfig>[0]);
    expect(result).toContain('export const config =');
    expect(result).toContain('as const');
  });

  it('should include name in config', () => {
    const ctx = { config: { name: 'MyProject' }, projectDir: '/tmp/test' };
    const result = generateOpenManualConfig(ctx as Parameters<typeof generateOpenManualConfig>[0]);
    expect(result).toContain('"name": "MyProject"');
  });

  it('should include navbar config when provided', () => {
    const ctx = {
      config: {
        ...baseConfig,
        navbar: { logo: '/logo.svg', github: 'https://github.com/test/repo' },
      },
      projectDir: '/tmp/test',
    };
    const result = generateOpenManualConfig(ctx as Parameters<typeof generateOpenManualConfig>[0]);
    expect(result).toContain('"navbar"');
    expect(result).toContain('"/logo.svg"');
  });

  it('should include sidebar config when provided', () => {
    const ctx = {
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            pages: [
              { slug: 'index', title: '首页' },
              { slug: 'quickstart', title: '快速上手' },
            ],
          },
        ],
      },
      projectDir: '/tmp/test',
    };
    const result = generateOpenManualConfig(ctx as Parameters<typeof generateOpenManualConfig>[0]);
    expect(result).toContain('"sidebar"');
    expect(result).toContain('"group": "开始"');
  });

  it('should not include contentDir or outputDir', () => {
    const ctx = {
      config: { ...baseConfig, contentDir: 'docs', outputDir: '.openmanual' },
      projectDir: '/tmp/test',
    };
    const result = generateOpenManualConfig(ctx as Parameters<typeof generateOpenManualConfig>[0]);
    expect(result).not.toContain('"contentDir"');
    expect(result).not.toContain('"outputDir"');
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

describe('template files', () => {
  const templatesDir = resolve(__dirname, '../core/generator/templates');

  const requiredTemplates = [
    'app/layout.tsx',
    'app/provider.tsx',
    'app/[[...slug]]/layout.tsx',
    'app/[[...slug]]/page.tsx',
    'lib/source.ts',
    'lib/layout.tsx',
    'components/mermaid.tsx',
    'components/page-actions.tsx',
    'postcss.config.mjs',
    'app/api/raw/[...path]/route.ts',
  ];

  it('should have all required template files', () => {
    for (const tpl of requiredTemplates) {
      expect(existsSync(resolve(templatesDir, tpl)), `Template ${tpl} should exist`).toBe(true);
    }
  });

  it('app/layout.tsx should import Provider and global.css', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'app/layout.tsx'),
      'utf-8'
    );
    expect(content).toContain("from './provider'");
    expect(content).toContain("'../global.css'");
    expect(content).toContain('RootLayout');
  });

  it('app/provider.tsx should import config from openmanual-config', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'app/provider.tsx'),
      'utf-8'
    );
    expect(content).toContain("'use client'");
    expect(content).toContain("from '@/openmanual-config'");
    expect(content).toContain('config.search');
  });

  it('lib/source.ts should import fumadocs loader', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'lib/source.ts'),
      'utf-8'
    );
    expect(content).toContain("'fumadocs-core/source'");
    expect(content).toContain('baseUrl');
  });

  it('lib/layout.tsx should import config and handle logo logic', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'lib/layout.tsx'),
      'utf-8'
    );
    expect(content).toContain("from '@/openmanual-config'");
    expect(content).toContain('baseOptions');
    expect(content).toContain('isImagePath');
    expect(content).toContain('dark:hidden');
  });

  it('components/mermaid.tsx should be a use client component', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'components/mermaid.tsx'),
      'utf-8'
    );
    expect(content).toContain("'use client'");
    expect(content).toContain('cachePromise');
    expect(content).toContain('Mermaid');
  });

  it('components/page-actions.tsx should include copy and view markdown', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'components/page-actions.tsx'),
      'utf-8'
    );
    expect(content).toContain("'use client'");
    expect(content).toContain('navigator.clipboard.writeText');
    expect(content).toContain('PageActions');
  });

  it('app/[[...slug]]/page.tsx should import config and handle strict mode', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'app/[[...slug]]/page.tsx'),
      'utf-8'
    );
    expect(content).toContain("from '@/openmanual-config'");
    expect(content).toContain('config.contentPolicy');
    expect(content).toContain('isAllowed');
    expect(content).toContain('generateStaticParams');
    expect(content).toContain('PageActions');
  });

  it('app/[[...slug]]/layout.tsx should include restructureTree', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'app/[[...slug]]/layout.tsx'),
      'utf-8'
    );
    expect(content).toContain("from '@/openmanual-config'");
    expect(content).toContain('restructureTree');
    expect(content).toContain('sidebarConfig');
    expect(content).toContain('DocsLayout');
  });

  it('postcss.config.mjs should include tailwindcss plugin', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'postcss.config.mjs'),
      'utf-8'
    );
    expect(content).toContain("'@tailwindcss/postcss'");
  });

  it('app/api/raw/[...path]/route.ts should export GET handler', () => {
    const content = require('node:fs').readFileSync(
      resolve(templatesDir, 'app/api/raw/[...path]/route.ts'),
      'utf-8'
    );
    expect(content).toContain('export async function GET');
    expect(content).toContain("'content'");
    expect(content).toContain('.mdx');
    expect(content).toContain('.md');
  });
});
