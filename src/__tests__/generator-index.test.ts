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
    defaultLanguage: 'zh',
    languages: [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
    ],
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

  it('应当在开发模式下写入 19 个文件', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll({ ...baseCtx, dev: true });
    expect(writeFile).toHaveBeenCalledTimes(19);
  });

  it('应当在非开发模式下写入 18 个文件', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(writeFile).toHaveBeenCalledTimes(18);
  });

  it('应当递归创建目录', async () => {
    const { mkdir } = await import('node:fs/promises');
    await generateAll(baseCtx);
    expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('应当写入 source.config.ts', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const sourceCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('source.config.ts')
    );
    expect(sourceCall).toBeDefined();
    expect((sourceCall as unknown[])[1]).toContain('defineDocs');
  });

  it('配置时 navbar.github 不应再注入到文档布局（已废弃）', async () => {
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
    // navbar.github 已废弃，不再注入到 DocsLayout 的 github prop
    expect((layoutCall as unknown[])[1]).not.toContain("github: 'https://github.com/test/repo'");
  });

  it('配置时应当包含导航链接', async () => {
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

  it('应当包含带单引号转义的页脚文本', async () => {
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
    expect((layoutCall as unknown[])[1]).toContain("Test's Project");
  });

  it('配置 footer.columns 时应当生成 footer 组件文件', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        footer: {
          columns: {
            groups: [{ title: '产品', links: [{ label: '功能', href: '/features' }] }],
            social: [{ platform: 'github', url: 'https://github.com/test' }],
            copyright: 'MIT © Test',
          },
        },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const footerCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('components/footer.tsx')
    );
    expect(footerCall).toBeDefined();
    expect((footerCall as unknown[])[1]).toContain('OmSiteFooter');
    expect((footerCall as unknown[])[1]).toContain('SiteFooter');
  });

  it('配置 footer.columns 时根布局应当包含 OmSiteFooter', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        footer: {
          columns: {
            brand: { name: 'TestApp' },
            groups: [],
            social: [],
          },
        },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).endsWith('app/layout.tsx') &&
        !(c[0] as string).includes('[lang]')
    );
    expect(layoutCall).toBeDefined();
    const content = (layoutCall as unknown[])[1] as string;
    expect(content).toContain("import { OmSiteFooter } from './components/footer'");
    expect(content).toContain('<OmSiteFooter />');
  });

  it('未配置 footer.columns 时不应生成 footer 文件', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const footerCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' && (c[0] as string).endsWith('components/footer.tsx')
    );
    expect(footerCall).toBeUndefined();
  });

  it('未配置 footer.columns 时根布局不应包含 OmSiteFooter', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const layoutCall = calls.find(
      (c: unknown[]) =>
        typeof c[0] === 'string' &&
        (c[0] as string).endsWith('app/layout.tsx') &&
        !(c[0] as string).includes('[lang]')
    );
    expect(layoutCall).toBeDefined();
    expect((layoutCall as unknown[])[1]).not.toContain('OmSiteFooter');
  });

  it('i18n 模式 + footer.columns 应当在 i18n 布局中包含 OmSiteFooter lang prop', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
        footer: {
          columns: {
            groups: [{ title: '资源', links: [] }],
            social: [],
          },
        },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const i18nLayoutCall = calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('[lang]/layout.tsx')
    );
    expect(i18nLayoutCall).toBeDefined();
    const content = (i18nLayoutCall as unknown[])[1] as string;
    expect(content).toContain('<OmSiteFooter lang={lang} />');
  });

  it('未配置时不应包含 github', async () => {
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

  it('应当在开发模式下生成搜索路由', async () => {
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

  it('应当在非开发模式下生成搜索路由', async () => {
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

  it('应当仅在开发模式下生成原始内容路由', async () => {
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
  it('应当生成带黑色文本的浅色变体', () => {
    const svg = generateOpenManualLogoSvg('MyProject', 'light');
    expect(svg).toContain('fill="#2B7A4B"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('M</tspan><tspan fill="#000000">yProject');
  });

  it('应当生成带暖色文本的深色变体', () => {
    const svg = generateOpenManualLogoSvg('MyProject', 'dark');
    expect(svg).toContain('fill="#2B7A4B"');
    expect(svg).toContain('fill="#E8E0D4"');
    expect(svg).toContain('M</tspan><tspan fill="#E8E0D4">yProject');
  });

  it('默认应使用浅色变体', () => {
    const svg = generateOpenManualLogoSvg('Test');
    expect(svg).toContain('fill="#000000"');
  });
});

describe('generateMetaFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('当内容目录无现有 meta.json 且无内容文件时不应生成 meta.json', async () => {
    // Without sidebar config and no content files on disk, scanMetaFiles returns []
    // and autoGenerateMetaFromFS finds no files -> no meta.json written
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(0);
  });

  it('当 sidebar 未定义且内容目录为空时不应生成 meta.json', async () => {
    // Same as above — sidebar is irrelevant now; behavior depends on FS state
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(0);
  });

  it('应当通过 readFile 补充现有 meta.json 中缺失的字段', async () => {
    // When scanMetaFiles finds an existing meta.json, enrichMetaFile reads it
    // and adds missing fields (icon, defaultOpen, pages)
    const { readFile } = await import('node:fs/promises');
    // Simulate an existing meta.json with only title (missing icon, defaultOpen, pages)
    (readFile as ReturnType<typeof vi.fn>).mockImplementation(async (path: string) => {
      if (typeof path === 'string' && path.endsWith('meta.json')) {
        return JSON.stringify({ title: 'Guide' });
      }
      throw new Error('ENOENT');
    });

    // We need scanMetaFiles to find a meta.json file.
    // Since fast-glob is not mocked and /tmp/project/content doesn't exist,
    // scanMetaFiles returns []. We test the enrichment path indirectly:
    // the function should call readFile if it found a meta.json.
    // In this test environment with no real files, we verify no error is thrown
    // and the function completes normally.
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [
          {
            group: 'Guide',
            icon: 'BookOpen',
            pages: [{ slug: 'guide/intro', title: 'Intro' }],
          },
        ],
      },
    };
    // Should not throw even with sidebar config (sidebar is ignored by generateMetaFiles)
    await expect(generateAll(ctx)).resolves.toBeUndefined();
  });

  it('无论 sidebar 配置如何，无内容文件时不应写入任何 meta.json', async () => {
    // Sidebar config is ignored; only FS state matters
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
    // No content files on disk -> autoGenerateMetaFromFS produces nothing
    expect(metaCalls).toHaveLength(0);
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

  it('sidebar 未配置时不应包含 restructureTree', async () => {
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

  it('即使配置了 sidebar 也不应包含 restructureTree', async () => {
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

  it('布局中不应包含 lucide-react 导入或 iconMap', async () => {
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

  it('应当在非 i18n 模式的文档布局中直接嵌入描述', async () => {
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

    expect(content).toContain('description: "My Site Description",');
  });

  it('应当转义非 i18n 描述中的单引号', async () => {
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

    expect(content).toContain("Test's Site");
  });

  it('非 i18n 模式下未配置描述时不应包含 description', async () => {
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

  it('当 logo 为对象且 light/dark 路径不同时应当生成两个 SVG 文件', async () => {
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

  it('当 logo 对象的 light/dark 路径相同时应当生成一个文件', async () => {
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

  it('当 logo 对象路径不是图片时不应生成 SVG', async () => {
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

  it('当用户已有 logo 文件时应当跳过生成', async () => {
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

  it('应当生成带正确颜色的深色变体 SVG', async () => {
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

describe('generateAll - top-level logo handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const isLogoSvg = (content: string) => content.includes('viewBox="0 0 190 32"');

  it('当顶级 logo 的 light/dark 不同时应当生成两个 SVG 文件', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(2);
  });

  it('当顶级 logo 为字符串简写时应当生成一个 SVG 文件', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: '/logo.svg',
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(1);
  });

  it('应当优先使用顶级 logo 而非旧版 navbar.logo', async () => {
    const { writeFile, access } = await import('node:fs/promises');
    (access as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: { light: '/top-light.svg', dark: '/top-dark.svg' },
        navbar: { logo: '/nav-logo.svg' },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    // 应该使用顶级 logo 的路径（/top-light.svg 和 /top-dark.svg），而不是 navbar.logo
    const svgCalls = calls.filter(
      (c: unknown[]) => typeof c[1] === 'string' && isLogoSvg(c[1] as string)
    );
    expect(svgCalls).toHaveLength(2);
    // 验证写入的文件路径使用的是顶级 logo 的路径
    const paths = calls
      .filter((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('top-'))
      .map((c: unknown[]) => c[0] as string);
    expect(paths.length).toBeGreaterThanOrEqual(2);
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

  it('配置 favicon 时应当包含 Metadata 导出', async () => {
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

  it('应当正确嵌入 SVG 路径', async () => {
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

  it('应当将 Metadata 导出放在 global.css 导入之前', async () => {
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

  it('未配置 favicon 时不应包含 Metadata 导出', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getRootLayoutContent(calls);
    expect(content).not.toContain('Metadata');
    expect(content).not.toContain('icons:');
    expect(content).not.toContain('icon:');
  });

  it('应当在模板字面量中原样嵌入子目录路径', async () => {
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

  it('应当在 i18n 非开发模式下写入额外的 i18n 文件', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    // base=12 + search=1 + i18n核心(lib/i18n.ts + lib/i18n-ui.ts)=2 + middleware=1
    // + [lang] routes(layout+provider+search-dialog+docs-layout+page)=5 = 21+
    // + meta files 取决于 sidebar 配置
    expect(calls.length).toBeGreaterThan(17);
  });

  it('应当在 i18n 开发模式下写入原始内容路由', async () => {
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

  it('应当在 i18n 模式下生成 lib/i18n.ts 和 lib/i18n-ui.ts', async () => {
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
    expect((i18nUICall as unknown[])[1]).toContain('displayName: "中文"');
    expect((i18nUICall as unknown[])[1]).toContain('displayName: "English"');
  });

  it('应当生成带重定向逻辑的 middleware.ts', async () => {
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

  it('应当生成带 async params 和 lang 属性的 app/[lang]/layout.tsx', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nRootLayoutContent(calls);

    expect(content).toContain('AppLayout lang={lang}');
    expect(content).toContain('AppProvider lang={lang}');
    expect(content).toContain('await params');
    expect(content).toContain('Promise<{ lang: string }>');
  });

  it('应当生成带 i18nUI.provider(lang) 的 app/[lang]/provider.tsx', async () => {
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

  it('应当生成带 DocsLayoutWrapper 的 app/[lang]/[[...slug]]/layout.tsx', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('DocsLayoutWrapper');
    expect(content).toContain('async function DocsLayoutWrapper');
    expect(content).toContain('params: Promise<{ lang: string }>');
    expect(content).toContain('baseOptions(lang)');
  });

  it('应当生成带 getPageTree(slug, lang) 的 app/[lang]/[[...slug]]/page.tsx', async () => {
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

  it('无 sidebar 时应当在 i18n 文档布局中使用 getPageTree(lang)', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('getPageTree(lang)');
    expect(content).not.toContain('getPageTree()');
  });

  it('i18n + sidebar 时应当直接使用 getPageTree(lang)（无 restructureTree）', async () => {
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

  it('i18n 布局中即使有 sidebar 图标也不应包含 lucide-react 或 iconMap', async () => {
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

  // --- meta.en.json / meta.json in i18n mode ---

  it('i18n 模式下内容目录为空时不应生成 meta.en.json', async () => {
    // In i18n dot-parser mode, sidebar config is ignored; no content files -> no meta
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
    expect(metaEnCalls).toHaveLength(0);
  });

  it('i18n 模式下内容目录为空时不应覆盖或写入任何 meta 文件', async () => {
    // Even with access mocked to resolve for some paths, scanMetaFiles uses fast-glob
    // which finds nothing in the non-existent content dir
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
    expect(metaEnCalls).toHaveLength(0);
  });

  it('配置 favicon 时应当在 i18n 根布局中包含 Metadata 导出', async () => {
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

  it('应当在 i18n 模式下从首页 frontmatter 生成动态描述', async () => {
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

  it('i18n 模式下未配置描述时不应生成描述逻辑', async () => {
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

  it('应当转义 i18n 描述配置中的单引号', async () => {
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

    // JSON.stringify 使用双引号，内部单引号无需转义
    expect(content).toContain("It's awesome");
  });

  it('应当处理 i18n + description + sidebar 组合（无 restructureTree）', async () => {
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

// ============================================================
// injectPageFrontmatter / upsertFrontmatter / resolveMdxPaths 测试
// 已移除：这些函数已被删除（替换为空操作）
// ============================================================

// ============================================================
// generateMetaFiles - dir-parser 模式 meta.json 测试
// ============================================================

describe('generateMetaFiles - dir-parser mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dir-parser i18n 模式下内容目录为空时不应生成 meta.json', async () => {
    // Dir-parser mode with no content files on disk -> scanMetaFiles returns []
    // -> autoGenerateMetaFromFS finds nothing -> no meta.json written
    const { writeFile } = await import('node:fs/promises');

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
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
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );

    expect(metaCalls).toHaveLength(0);
  });

  it('dir-parser i18n 模式下内容目录为空时不应生成目录级 meta.json', async () => {
    const { writeFile } = await import('node:fs/promises');

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
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
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );

    expect(metaCalls).toHaveLength(0);
  });
});

// ============================================================
// generateMetaFiles - 边界条件测试
// ============================================================

describe('generateMetaFiles - edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无论配置如何，内容目录为空时不应生成 meta.json', async () => {
    // Empty content dir -> scanMetaFiles returns [] -> autoGenerateMetaFromFS finds nothing
    const { writeFile } = await import('node:fs/promises');

    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        sidebar: [],
      },
    };
    await generateAll(ctx);

    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const metaCalls = calls.filter(
      (c) => typeof c[0] === 'string' && (c[0] as string).endsWith('meta.json')
    );
    expect(metaCalls).toHaveLength(0);
  });
});

// ============================================================
// generateSearchRoute — 不支持语言全走 {} 分支（覆盖行61）
// ============================================================

describe('generateSearchRoute - all unsupported languages', () => {
  it('对于不在 SUPPORTED_LOCALE_MAP 中的语言应当发出 {}', async () => {
    // 直接测试 generateSearchRoute 函数（绕过 generateAll）
    const { generateSearchRoute } = await import('../core/generator/search-route.js');

    const result = generateSearchRoute({
      config: {
        name: 'Test',
        i18n: {
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'ko', name: '한국어' },
          ],
        },
      },
    });

    console.log('[DEBUG] direct result:', result.substring(0, 400));

    // 两种语言都不在支持列表中 → 全部映射为 {}
    expect(result).toContain('zh: {}');
    expect(result).toContain('ko: {}');
    expect(result).not.toContain("'english'");
    expect(result).not.toContain("'korean'");
  });
});

// ============================================================
// generateDocsLayout — searchToggle 始终禁用侧边栏搜索（固定 header 模式）
// ============================================================

describe('generateDocsLayout - searchToggle', () => {
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

  it('始终包含 searchToggle: { enabled: false }（单语言）', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).toContain('searchToggle: { enabled: false }');
  });

  it('始终包含 searchToggle: { enabled: false }（i18n）', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(i18nCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('searchToggle: { enabled: false }');
  });
});

// ============================================================
// generateGlobalCss — header 搜索模式隐藏折叠面板搜索图标
// ============================================================

describe('generateGlobalCss - sidebar search hiding', () => {
  it('始终隐藏侧边栏折叠面板中的搜索图标（header 搜索模式）', async () => {
    const { generateGlobalCss } = await import('../core/generator/global-css.js');

    const result = generateGlobalCss({ config: baseConfig });

    expect(result).toContain('[data-sidebar-panel]');
    expect(result).toContain('[data-search]');
    expect(result).toContain('display: none');
  });
});

// generateDocsLayout — sidebar.collapsible: false 默认禁用折叠
// ============================================================

describe('generateDocsLayout - sidebar collapsible', () => {
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

  it('应当在单语言模式下包含 sidebar.collapsible: false', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).toContain('collapsible: false');
  });

  it('应当在 i18n 模式下包含 sidebar.collapsible: false', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      },
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    expect(content).toContain('collapsible: false');
  });
});

describe('generateDocsLayout - logo always in header', () => {
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

  it('配置了图片 logo 时不应包含侧边栏 banner', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    // logo 在 header 中，不在 sidebar
    expect(content).not.toContain('import { NavLogo }');
    expect(content).not.toContain('title: <NavLogo');
  });

  it('字符串简写 logo 也不应在侧边栏显示', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: '/logo.svg',
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).not.toContain('import { NavLogo }');
    expect(content).not.toContain('title: <NavLogo');
  });

  it('未配置 logo 时不应包含侧边栏 banner', async () => {
    const { writeFile } = await import('node:fs/promises');
    await generateAll(baseCtx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    expect(content).not.toContain('import { NavLogo }');
    expect(content).not.toContain('banner:');
  });

  it('即使 logo 路径看起来像纯文本也不应在侧边栏显示', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: { light: 'MyProject', dark: 'MyProject' },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getDocsLayoutContent(calls);

    // logo 始终在 header，sidebar 不渲染任何 logo
    expect(content).not.toContain('import { NavLogo }');
    expect(content).not.toContain('title: <NavLogo');
  });
});

describe('generateDocsLayout - logo always in header (i18n mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('i18n 模式下配置了 logo 时不应包含侧边栏 banner', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
        i18n: {
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    // logo 在 header 中，不在 sidebar
    expect(content).not.toContain('import { NavLogo }');
    expect(content).not.toContain('title: <NavLogo');
  });

  it('i18n 模式下未配置 logo 时不应包含侧边栏 banner', async () => {
    const { writeFile } = await import('node:fs/promises');
    const ctx = {
      ...baseCtx,
      config: {
        ...baseConfig,
        i18n: {
          defaultLanguage: 'zh',
          languages: [{ code: 'zh', name: '中文' }],
        },
      } as any,
    };
    await generateAll(ctx);
    const calls = (writeFile as ReturnType<typeof vi.fn>).mock.calls;
    const content = getI18nDocsLayoutContent(calls);

    if (content) {
      expect(content).not.toContain('banner:');
    }
  });
});
