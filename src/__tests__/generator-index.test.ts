import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateAll, generateOpenManualLogoSvg } from '../core/generator/index.js';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
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

  it('should write 15 files in dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...baseCtx, dev: true });
    expect(writeFile).toHaveBeenCalledTimes(15);
  });

  it('should write 14 files in non-dev mode', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(writeFile).toHaveBeenCalledTimes(14);
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

describe('generateDocsLayout - restructureTree', () => {
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

  it('should include restructureTree import when sidebar is configured', async () => {
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
    const content = getDocsLayoutContent(calls);
    expect(content).toContain(
      "import { restructureTree } from 'openmanual/utils/restructure-tree'"
    );
    expect(content).toContain('sidebarConfig');
    expect(content).not.toContain('interface TreeNode');
    expect(content).toContain('restructureTree(source.getPageTree(), sidebarConfig)');
  });

  it('should embed sidebar config with group, collapsed and page slugs', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: '开始',
            collapsed: false,
            pages: [
              { slug: 'index', title: '首页' },
              { slug: 'quickstart', title: '快速上手' },
            ],
          },
          {
            group: '进阶',
            collapsed: true,
            pages: [{ slug: 'advanced/search', title: '搜索' }],
          },
        ],
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);
    // Should contain the sidebar config JSON
    expect(content).toContain('"group": "开始"');
    expect(content).toContain('"group": "进阶"');
    expect(content).toContain('"collapsed": true');
    expect(content).toContain('"slug": "index"');
    expect(content).toContain('"slug": "quickstart"');
    expect(content).toContain('"slug": "advanced/search"');
    // Should NOT contain titles (only slugs are needed for restructuring)
    expect(content).not.toContain('"title": "首页"');
  });

  it('should import restructureTree utility instead of embedding function body', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
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
    const content = getDocsLayoutContent(calls);
    // Should use import instead of embedded function body
    expect(content).toContain(
      "import { restructureTree } from 'openmanual/utils/restructure-tree'"
    );
    // Should NOT embed slugToUrl or restructureTree function definitions
    expect(content).not.toContain('function slugToUrl');
    expect(content).not.toContain('function restructureTree');
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
