import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateAll, generateOpenManualLogoSvg } from '../core/generator/index.js';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
}));

// Mock node:fs (sync) for template-reader
vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    // Return fake template content based on file name
    if (path.includes('layout.tsx') && path.includes('[[')) return 'fake-docs-layout';
    if (path.includes('page.tsx')) return 'fake-page';
    if (path.includes('provider.tsx')) return 'fake-provider';
    if (path.includes('app/layout.tsx')) return 'fake-root-layout';
    if (path.includes('source.ts')) return 'fake-source';
    if (path.includes('lib/layout.tsx')) return 'fake-lib-layout';
    if (path.includes('mermaid.tsx')) return 'fake-mermaid';
    if (path.includes('page-actions.tsx')) return 'fake-page-actions';
    if (path.includes('postcss')) return 'fake-postcss';
    if (path.includes('route.ts')) return 'fake-route';
    return 'fake-template';
  }),
}));

const baseConfig: OpenManualConfig = { name: 'Test' };
const baseCtx = {
  config: baseConfig,
  projectDir: '/tmp/project',
  appDir: '/tmp/project/.openmanual/app',
  contentDir: 'content',
};

describe('generateAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should write 15 files in dev mode (6 generated + 10 templates - 1 non-dev)', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...baseCtx, dev: true });
    // 6 generated + 10 template files (including api route)
    expect(writeFile).toHaveBeenCalledTimes(16);
  });

  it('should write 15 files in non-dev mode (6 generated + 9 templates)', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    // 6 generated + 9 template files (no api route)
    expect(writeFile).toHaveBeenCalledTimes(15);
  });

  it('should create directories recursively', async () => {
    const { mkdir } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('should write openmanual-config.ts', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const configCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('openmanual-config.ts')
    );
    expect(configCall).toBeDefined();
    expect((configCall as unknown[])[1]).toContain('export const config');
    expect((configCall as unknown[])[1]).toContain('as const');
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

  it('should write template files via readTemplate', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    // Verify template files were written with content from readTemplate
    const layoutCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('app/layout.tsx')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).toBe('fake-root-layout');
  });

  it('should write api route template only in dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');

    // Non-dev: should not have api route
    await generateAll(baseCtx);
    let calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    let routeCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('api/raw')
    );
    expect(routeCall).toBeUndefined();

    vi.clearAllMocks();

    // Dev: should have api route
    await generateAll({ ...baseCtx, dev: true });
    calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    routeCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('api/raw')
    );
    expect(routeCall).toBeDefined();
    expect((routeCall as unknown[])[1]).toBe('fake-route');
  });

  it('should include sidebar config in openmanual-config.ts when configured', async () => {
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
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const configCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('openmanual-config.ts')
    );
    expect(configCall).toBeDefined();
    expect((configCall as unknown[])[1]).toContain('"sidebar"');
    expect((configCall as unknown[])[1]).toContain('"group": "开始"');
    expect((configCall as unknown[])[1]).toContain('"slug": "index"');
  });

  it('should include github link in openmanual-config.ts when configured', async () => {
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
    const configCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('openmanual-config.ts')
    );
    expect(configCall).toBeDefined();
    expect((configCall as unknown[])[1]).toContain('https://github.com/test/repo');
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

  it('should generate meta.json for sidebar groups with directory prefixes', async () => {
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
    expect(metaCalls).toHaveLength(2);
    expect(metaCalls[0]?.[0]).toContain('guide');
    expect(metaCalls[0]?.[1]).toBe(`${JSON.stringify({ title: '指南' }, null, 2)}\n`);
    expect(metaCalls[1]?.[0]).toContain('advanced');
    expect(metaCalls[1]?.[1]).toBe(`${JSON.stringify({ title: '进阶' }, null, 2)}\n`);
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
    // Simulate meta.json already exists for guide directory
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
    // Only advanced/meta.json should be written, guide/meta.json should be skipped
    expect(metaCalls).toHaveLength(1);
    expect(metaCalls[0]?.[0]).toContain('advanced');
  });

  it('should skip root-level pages without directory prefix', async () => {
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
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(0);
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
