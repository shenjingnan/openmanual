import { describe, expect, it } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateGlobalCss } from '../core/generator/global-css.js';
import { generateLayout, isImagePath, resolveLogoPaths } from '../core/generator/layout.js';
import { generateLibSource } from '../core/generator/lib-source.js';
import { generateNextConfig } from '../core/generator/next-config.js';
import { generatePackageJson } from '../core/generator/package-json.js';
import { generatePage } from '../core/generator/page.js';
import { generatePostcssConfig } from '../core/generator/postcss-config.js';
import { generateProvider } from '../core/generator/provider.js';
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
    const darkBlock = result.match(/\.dark \{[^}]+\}/s)![0];
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
  it('should include output export when siteUrl is set', () => {
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

  it('should always set images.unoptimized to true', () => {
    const result = generateNextConfig(baseCtx);
    expect(result).toContain('unoptimized: true');
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
});

describe('generatePage', () => {
  it('should import source and MDX components', () => {
    const result = generatePage(baseCtx);
    expect(result).toContain("from '@/lib/source'");
    expect(result).toContain("from 'fumadocs-ui/page'");
    expect(result).toContain("from 'fumadocs-ui/mdx'");
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
