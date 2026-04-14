import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateAll, generateOpenManualLogoSvg } from '../core/generator/index.js';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
}));

const baseConfig: OpenManualConfig = { name: 'Test' };
const baseCtx = {
  config: baseConfig,
  projectDir: '/tmp/project',
  appDir: '/tmp/project/.cache/app',
  contentDir: 'content',
};

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

const i18nCtx = {
  config: i18nConfig,
  projectDir: '/tmp/project',
  appDir: '/tmp/project/.cache/app',
  contentDir: 'content',
};

describe('generateAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should write 18 files in dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...baseCtx, dev: true });
    expect(writeFile).toHaveBeenCalledTimes(18);
  });

  it('should write 17 files in non-dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(writeFile).toHaveBeenCalledTimes(17);
  });

  it('should create directories recursively', async () => {
    const { mkdir } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('should write source.config.ts', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const sourceCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('source.config.ts')
    );
    expect(sourceCall).toBeDefined();
    expect((sourceCall as unknown[])[1]).toContain('defineDocs');
  });

  it('should include docs layout with github link when configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { github: 'https://github.com/test/repo' },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).toContain('github');
    expect((layoutCall as unknown[])[1]).toContain('https://github.com/test/repo');
  });

  it('should include nav links when configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: {
          links: [{ label: 'Blog', href: 'https://blog.example.com' }],
        },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).toContain('Blog');
  });

  it('should include footer text with single quote escaping', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        footer: { text: "MIT 2025 © Test's Project" },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).toContain("Test\\'s Project");
  });

  it('should not include github when not configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).not.toContain('github:');
  });

  it('should generate search route in dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...baseCtx, dev: true });
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const searchRouteCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('app/api/search/route.ts')
    );
    expect(searchRouteCall).toBeDefined();
    expect((searchRouteCall as unknown[])[1]).toContain('createFromSource');
    expect((searchRouteCall as unknown[])[1]).toContain('staticGET');
  });

  it('should generate search route in non-dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const searchRouteCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('app/api/search/route.ts')
    );
    expect(searchRouteCall).toBeDefined();
    expect((searchRouteCall as unknown[])[1]).toContain('createFromSource');
    expect((searchRouteCall as unknown[])[1]).toContain('staticGET');
  });

  it('should generate raw content route only in dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');

    // Dev mode should have raw content route
    await generateAll({ ...baseCtx, dev: true });
    const devCalls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const devRawCall = devCalls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('api/raw') &&
        (c[0] as string).endsWith('route.ts')
    );
    expect(devRawCall).toBeDefined();

    vi.clearAllMocks();

    // Non-dev mode should NOT have raw content route
    await generateAll(baseCtx);
    const prodCalls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const prodRawCall = prodCalls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('api/raw') &&
        (c[0] as string).endsWith('route.ts')
    );
    expect(prodRawCall).toBeUndefined();
  });
});

describe('generateOpenManualLogoSvg', () => {
  it('should generate light variant with black text', () => {
    const svg = generateOpenManualLogoSvg('MyProject', 'light');
    expect(svg).toContain('fill="#2B7A4B"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('M</tspan><tspan fill="#000000">yProject');
  });

  it('should generate dark variant with warm text', () => {
    const svg = generateOpenManualLogoSvg('MyProject', 'dark');
    expect(svg).toContain('fill="#2B7A4B"');
    expect(svg).toContain('fill="#E8E0D4"');
    expect(svg).toContain('M</tspan><tspan fill="#E8E0D4">yProject');
  });

  it('should default to light variant', () => {
    const svg = generateOpenManualLogoSvg('Test');
    expect(svg).toContain('fill="#000000"');
  });
});

describe('generateMetaFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate complete meta.json with title, icon, defaultOpen, and pages for directory groups', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
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
          {
            group: '指南',
            icon: 'BookOpen',
            collapsed: true,
            pages: [
              { slug: 'guide/configuration', title: '配置' },
              { slug: 'guide/writing', title: '编写' },
            ],
          },
          {
            group: '进阶',
            pages: [{ slug: 'advanced/search', title: '搜索' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );

    // Root-level group + 2 directory groups = 3 meta.json files
    expect(metaCalls).toHaveLength(3);

    // Root-level meta.json (for "开始" group) — path ends with /content/meta.json (no subdir like /guide/)
    const rootMeta = metaCalls.find((c) => {
      const p = c[0] as string;
      return (
        p.endsWith('meta.json') && !p.match(/\/(guide|advanced|components|community|community)\//)
      );
    });
    expect(rootMeta).toBeDefined();
    const rootData = JSON.parse((rootMeta as unknown[])[1] as string);
    expect(rootData.title).toBe('开始');
    expect(rootData.pages).toEqual(['index', 'quickstart']);

    // Guide directory meta.json with full fields
    const guideMeta = metaCalls.find((c) => (c[0] as string).includes('guide'));
    expect(guideMeta).toBeDefined();
    const guideData = JSON.parse((guideMeta as unknown[])[1] as string);
    expect(guideData.title).toBe('指南');
    expect(guideData.icon).toBe('BookOpen');
    expect(guideData.defaultOpen).toBe(false); // collapsed=true → defaultOpen=false
    expect(guideData.pages).toEqual(['configuration', 'writing']);

    // Advanced directory meta.json (minimal)
    const advMeta = metaCalls.find((c) => (c[0] as string).includes('advanced'));
    expect(advMeta).toBeDefined();
    const advData = JSON.parse((advMeta as unknown[])[1] as string);
    expect(advData.title).toBe('进阶');
    expect(advData.pages).toEqual(['search']);
  });

  it('should not generate meta.json when sidebar is undefined', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(0);
  });

  it('should not overwrite existing meta.json', async () => {
    const { access, writeFile } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('guide') && path.endsWith('meta.json')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('ENOENT'));
    });

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '指南',
            pages: [{ slug: 'guide/configuration', title: '配置' }],
          },
          {
            group: '进阶',
            pages: [{ slug: 'advanced/search', title: '搜索' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    // Only advanced/meta.json should be written; guide/meta.json skipped; root meta for "指南" still written
    expect(metaCalls.length).toBeGreaterThanOrEqual(1);
    expect(metaCalls.some((c) => (c[0] as string).includes('advanced'))).toBe(true);
    expect(metaCalls.every((c) => !(c[0] as string).includes('guide'))).toBe(true);
  });

  it('should generate root-level meta.json for groups without directory prefix', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            icon: 'Rocket',
            collapsed: false,
            pages: [
              { slug: 'index', title: '首页' },
              { slug: 'quickstart', title: '快速上手' },
            ],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(1);
    const data = JSON.parse((metaCalls[0] as unknown[])[1] as string);
    expect(data.title).toBe('开始');
    expect(data.icon).toBe('Rocket');
    expect(data.defaultOpen).toBe(true); // collapsed=false → defaultOpen=true
    expect(data.pages).toEqual(['index', 'quickstart']);
  });

  it.skip('should generate per-language meta.json in dir-parser i18n mode (TODO: fix vitest mock interaction)', async () => {
    const { writeFile } = await import('node:fs/promises');
    // Use same pattern as the passing "complete meta.json" test but with i18n dir-parser
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir' as const,
        },
        sidebar: [
          {
            group: '指南',
            icon: 'BookOpen',
            collapsed: true,
            pages: [{ slug: 'guide/configuration', title: '配置' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    // Dir parser i18n: should write to content/zh/guide/meta.json AND content/en/guide/meta.json
    expect(metaCalls.length).toBeGreaterThanOrEqual(2);
    const paths = metaCalls.map((c) => c[0] as string);
    expect(paths.some((p) => p.includes('/zh/guide/'))).toBe(true);
    expect(paths.some((p) => p.includes('/en/guide/'))).toBe(true);
    // Verify content of one of them
    const guideMeta = metaCalls.find((c) => (c[0] as string).includes('guide'));
    expect(guideMeta).toBeDefined();
    const data = JSON.parse((guideMeta as unknown[])[1] as string);
    expect(data.title).toBe('指南');
    expect(data.icon).toBe('BookOpen');
    expect(data.defaultOpen).toBe(false);
  });
});

describe('generateDocsLayout - no restructureTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getDocsLayoutContent(calls: unknown[][]): string {
    const layoutCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    return (layoutCall as unknown[])?.[1] as string;
  }

  it('should not include restructureTree when sidebar is not configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);
    expect(content).not.toContain('restructureTree');
    expect(content).not.toContain(
      "import { restructureTree } from 'openmanual/utils/restructure-tree'"
    );
    expect(content).toContain('tree: source.getPageTree()');
  });

  it('should NOT include restructureTree even when sidebar is configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            icon: 'Rocket',
            collapsed: false,
            pages: [
              { slug: 'index', title: '首页', icon: 'Home' },
              { slug: 'quickstart', title: '快速上手', icon: 'Zap' },
            ],
          },
          {
            group: '指南',
            icon: 'BookOpen',
            collapsed: true,
            pages: [{ slug: 'guide/configuration', title: '配置', icon: 'Settings' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    // Must NOT contain any restructureTree references
    expect(content).not.toContain('restructureTree');
    expect(content).not.toContain('sidebarConfig');
    expect(content).not.toContain('iconMap');
    expect(content).not.toContain('lucide-react');

    // Should use native getPageTree()
    expect(content).toContain('tree: source.getPageTree()');
  });

  it('should not contain lucide-react imports or iconMap in layout', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            icon: 'BookOpen',
            pages: [{ slug: 'index', title: '首页', icon: 'Home' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).not.toContain('lucide-react');
    expect(content).not.toContain('const iconMap');
    expect(content).not.toContain('const sidebarConfig');
  });
});

describe('generateDocsLayout - description', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getDocsLayoutContent(calls: unknown[][]): string {
    const layoutCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    return (layoutCall as unknown[])?.[1] as string;
  }

  it('should embed description directly in non-i18n mode docs layout', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        description: 'My Site Description',
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).toContain("description: 'My Site Description',");
  });

  it('should escape single quotes in non-i18n description', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        description: "Test's Site",
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).toContain("Test\\'s Site");
  });

  it('should not include description when not configured in non-i18n mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).not.toContain('description:');
  });
});

describe('generateAll - logo handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: filter writeFile calls that contain the OpenManual logo SVG (viewBox 0 0 190 32)
  const isLogoSvg = (content: string) => content.includes('viewBox="0 0 190 32"');

  it('should generate two SVG files when logo is object with different light and dark paths', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(2);
  });

  it('should generate one file when logo object has same light and dark paths', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo.svg', dark: '/logo.svg' } },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(1);
  });

  it('should not generate SVG when logo object paths are not images', async () => {
    const { writeFile } = await import('node:fs/promises');

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { logo: { light: 'MyProject', dark: 'MyProject' } },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(0);
  });

  it('should skip generation when user already has logo file', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { logo: '/logo.svg' },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(0);
  });

  it('should generate dark variant SVG with correct color', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const darkSvgCall = calls.find(
      (c: unknown[]) =>
        typeof c[1] === 'string' &&
        isLogoSvg(c[1] as string) &&
        (c[1] as string).includes('fill="#E8E0D4"')
    );
    expect(darkSvgCall).toBeDefined();
  });
});

describe('generateAll - favicon handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getRootLayoutContent(calls: unknown[][]): string {
    const layoutCall = calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('app/layout.tsx')
    );
    return (layoutCall as unknown[])?.[1] as string;
  }

  it('should include Metadata export when favicon is configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: { ...baseConfig, favicon: '/favicon.ico' },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    expect(content).toContain("import type { Metadata } from 'next'");
    expect(content).toContain('export const metadata: Metadata = {');
    expect(content).toContain('icons: {');
    expect(content).toContain("icon: '/favicon.ico'");
  });

  it('should embed SVG path correctly', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: { ...baseConfig, favicon: '/favicon.svg' },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    expect(content).toContain("icon: '/favicon.svg'");
  });

  it('should place Metadata export before global.css import', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: { ...baseConfig, favicon: '/favicon.ico' },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    const metadataIndex = content.indexOf('export const metadata');
    const cssImportIndex = content.indexOf("import '../global.css'");
    expect(metadataIndex).toBeLessThan(cssImportIndex);
  });

  it('should not include Metadata export when favicon is not configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    expect(content).not.toContain('Metadata');
    expect(content).not.toContain('icons:');
    expect(content).not.toContain('icon:');
  });

  it('should embed subdirectory path as-is in template literal', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: { ...baseConfig, favicon: '/assets/icons/favicon.svg' },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    expect(content).toContain("icon: '/assets/icons/favicon.svg'");
  });
});

// ============================================================
// generateAll — i18n 多语言模式
// ============================================================

describe('generateAll - i18n mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** 从 writeFile calls 中提取 [lang]/layout.tsx 的内容 */
  function getI18nRootLayoutContent(calls: unknown[][]): string {
    const layoutCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[lang]') &&
        (c[0] as string).endsWith('layout.tsx') &&
        !(c[0] as string).includes('[[...slug]]')
    );
    return (layoutCall as unknown[])?.[1] as string;
  }

  /** 从 writeFile calls 中提取 [lang]/[[...slug]]/layout.tsx 的内容 */
  function getI18nDocsLayoutContent(calls: unknown[][]): string {
    const layoutCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[lang]') &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('layout.tsx')
    );
    return (layoutCall as unknown[])?.[1] as string;
  }

  // --- 文件列表 ---

  it('should write additional i18n files in i18n non-dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    // base=12 + search=1 + i18n核心(lib/i18n.ts + lib/i18n-ui.ts)=2 + middleware=1
    // + [lang] routes(layout+provider+search-dialog+docs-layout+page)=5 = 21+
    // + meta files 取决于 sidebar 配置
    expect(calls.length).toBeGreaterThan(17);
  });

  it('should write raw content route in i18n dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...i18nCtx, dev: true });
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const rawRouteCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('api/raw') &&
        (c[0] as string).endsWith('route.ts')
    );
    expect(rawRouteCall).toBeDefined();
  });

  it('should generate lib/i18n.ts and lib/i18n-ui.ts in i18n mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;

    const i18nCall = calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('lib/i18n.ts')
    );
    expect(i18nCall).toBeDefined();
    expect((i18nCall as unknown[])[1]).toContain('defineI18n');
    expect((i18nCall as unknown[])[1]).toContain("'zh'");
    expect((i18nCall as unknown[])[1]).toContain("'en'");

    const i18nUICall = calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('lib/i18n-ui.ts')
    );
    expect(i18nUICall).toBeDefined();
    expect((i18nUICall as unknown[])[1]).toContain('defineI18nUI');
    expect((i18nUICall as unknown[])[1]).toContain("displayName: '中文'");
    expect((i18nUICall as unknown[])[1]).toContain("displayName: 'English'");
  });

  it('should generate middleware.ts with redirect logic', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const mwCall = calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('middleware.ts')
    );
    expect(mwCall).toBeDefined();
    expect((mwCall as unknown[])[1]).toContain('NextResponse.redirect');
    expect((mwCall as unknown[])[1]).toContain("pathname === '/'");
  });

  // --- [lang]/ 路由结构 ---

  it('should generate app/[lang]/layout.tsx with async params and lang prop', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nRootLayoutContent(calls);

    expect(content).toContain('AppLayout lang={lang}');
    expect(content).toContain('AppProvider lang={lang}');
    expect(content).toContain('await params');
    expect(content).toContain('Promise<{ lang: string }>');
  });

  it('should generate app/[lang]/provider.tsx with i18nUI.provider(lang)', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const providerCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[lang]') &&
        (c[0] as string).endsWith('provider.tsx')
    );
    expect(providerCall).toBeDefined();
    expect((providerCall as unknown[])[1]).toContain('i18n={i18nUI.provider(lang)}');
    expect((providerCall as unknown[])[1]).toContain('{ children, lang }');
  });

  it('should generate app/[lang]/[[...slug]]/layout.tsx with DocsLayoutWrapper', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('DocsLayoutWrapper');
    expect(content).toContain('async function DocsLayoutWrapper');
    expect(content).toContain('params: Promise<{ lang: string }>');
    expect(content).toContain('baseOptions(lang)');
  });

  it('should generate app/[lang]/[[...slug]]/page.tsx with getPageTree(slug, lang)', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const pageCall = calls.find(
      (c) =>
        typeof c[0] === 'string' &&
        (c[0] as string).includes('[lang]') &&
        (c[0] as string).includes('[[...slug]]') &&
        (c[0] as string).endsWith('page.tsx')
    );
    expect(pageCall).toBeDefined();
    expect((pageCall as unknown[])[1]).toMatch(/getPage\(slug,\s*lang\)/);
  });

  // --- docs layout 细节 ---

  it('should use getPageTree(lang) in i18n docs layout when no sidebar', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('getPageTree(lang)');
    expect(content).not.toContain('getPageTree()');
  });

  it('should use getPageTree(lang) directly when i18n + sidebar (no restructureTree)', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        sidebar: [
          {
            group: '开始',
            pages: [{ slug: 'index', title: '首页' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    // Should NOT contain restructureTree
    expect(content).not.toContain('restructureTree');
    expect(content).not.toContain('sidebarConfig');
    // Should use native getPageTree
    expect(content).toContain('tree: source.getPageTree(lang)');
  });

  it('should not include lucide-react or iconMap in i18n layout even with sidebar icons', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        sidebar: [
          {
            group: '开始',
            icon: 'BookOpen',
            pages: [{ slug: 'index', title: '首页', icon: 'Home' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).not.toContain('lucide-react');
    expect(content).not.toContain('const iconMap');
    expect(content).not.toContain('const sidebarConfig');
    expect(content).not.toContain('restructureTree');
  });

  // --- meta.en.json 生成 ---

  it('should generate meta.en.json for each sidebar group directory in i18n mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        sidebar: [
          {
            group: '指南',
            pages: [{ slug: 'guide/configuration', title: '配置' }],
          },
          {
            group: '进阶',
            pages: [{ slug: 'advanced/search', title: '搜索' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaEnCalls = calls.filter(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.en.json')
    );
    expect(metaEnCalls).toHaveLength(2);
    expect(metaEnCalls[0]?.[1]).toContain('"title": "指南"');
    expect(metaEnCalls[1]?.[1]).toContain('"title": "进阶"');
  });

  it('should not overwrite existing meta.en.json', async () => {
    const { access, writeFile } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('guide') && path.endsWith('meta.en.json')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('ENOENT'));
    });

    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        sidebar: [
          {
            group: '指南',
            pages: [{ slug: 'guide/configuration', title: '配置' }],
          },
          {
            group: '进阶',
            pages: [{ slug: 'advanced/search', title: '搜索' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaEnCalls = calls.filter(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.en.json')
    );
    // Only advanced/meta.en.json should be written; guide/meta.en.json skipped
    expect(metaEnCalls).toHaveLength(1);
    expect(metaEnCalls[0]?.[0]).toContain('advanced');
  });

  it('should include Metadata export in i18n root layout when favicon configured', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: { ...i18nConfig, favicon: '/favicon.ico' },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nRootLayoutContent(calls);

    expect(content).toContain("import type { Metadata } from 'next'");
    expect(content).toContain('export const metadata: Metadata = {');
    expect(content).toContain("icon: '/favicon.ico'");
  });

  // --- description 动态获取 ---

  it('should generate dynamic description from index page frontmatter in i18n mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        description: 'AI 友好的开源文档系统框架',
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    // 应包含 configDescription 常量声明
    expect(content).toContain('const configDescription');
    expect(content).toContain('AI 友好的开源文档系统框架');
    // 应包含从首页动态获取 description 的逻辑
    expect(content).toContain('source.getPage([], lang)');
    expect(content).toContain('siteDescription');
    expect(content).toContain('indexPage?.data.description ?? configDescription');
    // docsOptions 中应包含动态 description
    expect(content).toContain('description: siteDescription,');
  });

  it('should not generate description logic when no description configured in i18n mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    // i18nCtx 默认没有 description 字段
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).not.toContain('configDescription');
    expect(content).not.toContain('siteDescription');
    expect(content).not.toContain('source.getPage([], lang)');
    expect(content).not.toContain('description: siteDescription,');
  });

  it('should escape single quotes in i18n description config', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        description: "It's awesome",
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    // 单引号应被转义为 \'
    expect(content).toContain("It\\'s awesome");
  });

  it('should handle i18n + description + sidebar combination without restructureTree', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...i18nCtx,
      config: {
        ...i18nConfig,
        description: '文档站点生成器',
        sidebar: [
          {
            group: '开始',
            icon: 'BookOpen',
            pages: [{ slug: 'index', title: '首页', icon: 'Home' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    // Should NOT contain restructureTree, lucide-react, iconMap, or sidebarConfig
    expect(content).not.toContain('restructureTree');
    expect(content).not.toContain('lucide-react');
    expect(content).not.toContain('const iconMap');
    expect(content).not.toContain('sidebarConfig');

    // description 相关：动态获取逻辑 should still work
    expect(content).toContain('configDescription');
    expect(content).toContain('siteDescription');
    expect(content).toContain('description: siteDescription,');

    // Should use native getPageTree(lang)
    expect(content).toContain('tree: source.getPageTree(lang)');
  });
});
