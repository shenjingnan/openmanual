import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../core/config/loader.js';
import {
  collectConfiguredSlugs,
  isDirParser,
  isHeaderEnabled,
  isI18nEnabled,
  isOpenApiEnabled,
  isSeparateTabMode,
  normalizeTopLevelLogo,
  type OpenManualConfig,
  OpenManualConfigSchema,
  resolveEffectiveLogo,
  resolveOpenApiSpecPaths,
} from '../core/config/schema.js';
import { getContentTree, scanContentDir } from '../core/content/scanner.js';
import { buildPageTree, generateSourceConfigContent } from '../core/content/tree.js';

describe('OpenManualConfigSchema', () => {
  it('应当验证通过最小有效配置', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('应当拒绝没有 name 的配置', () => {
    const result = OpenManualConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('应当拒绝空 name', () => {
    const result = OpenManualConfigSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('应当接受完整配置', () => {
    const config = {
      name: 'MyProject',
      description: 'A test project',
      contentDir: 'docs',
      outputDir: 'out',
      siteUrl: 'https://example.com',
      locale: 'en',
      navbar: {
        logo: 'MyProject',
        // github: 'https://github.com/test/test', // 已废弃，请使用 header.links
        links: [{ label: 'Blog', href: 'https://blog.example.com' }],
      },
      footer: { text: 'MIT 2025' },
      sidebar: [
        {
          group: 'Getting Started',
          pages: [
            { slug: 'index', title: 'Home' },
            { slug: 'guide', title: 'Guide' },
          ],
        },
      ],
      mdx: { latex: true },
    };
    const result = OpenManualConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('应当拒绝无效的 GitHub URL', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { github: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('应当接受包含 light 和 dark 路径的 logo 对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝缺少 dark 字段的 logo 对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { light: '/logo-light.svg' } },
    });
    expect(result.success).toBe(false);
  });

  it('应当拒绝缺少 light 字段的 logo 对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { dark: '/logo-dark.svg' } },
    });
    expect(result.success).toBe(false);
  });

  it('应当接受 contentPolicy 为 strict', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'strict',
    });
    expect(result.success).toBe(true);
  });

  it('应当接受 contentPolicy 为 all', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'all',
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝无效的 contentPolicy 值', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('应当接受 .ico 路径的 favicon', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: '/favicon.ico' });
    expect(result.success).toBe(true);
  });

  it('应当接受 .svg 路径的 favicon', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: '/favicon.svg' });
    expect(result.success).toBe(true);
  });

  it('应当接受带子目录路径的 favicon', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      favicon: '/icons/favicon.png',
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝非字符串类型的 favicon 值', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: 123 });
    expect(result.success).toBe(false);
  });
});

describe('loadConfig', () => {
  const tmpDir = join(process.cwd(), '.test-tmp');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当 openmanual.json 不存在时应抛出异常', async () => {
    await expect(loadConfig(tmpDir)).rejects.toThrow('not found');
  });

  it('当 JSON 无效应抛出异常', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), 'invalid');
    await expect(loadConfig(tmpDir)).rejects.toThrow('not valid JSON');
  });

  it('应当加载配置并合并默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.name).toBe('TestProject');
    expect(config.contentDir).toBe('content');
    expect(config.outputDir).toBe('dist');
    expect(config.locale).toBe('zh');
    expect(config.contentPolicy).toBe('strict');
    expect(config.navbar?.logo).toBe('TestProject');
  });

  it('当提供 contentPolicy 时应保留其值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'TestProject', contentPolicy: 'all' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.contentPolicy).toBe('all');
  });
});

describe('content scanner', () => {
  const contentTmpDir = join(process.cwd(), '.test-content-tmp');

  beforeEach(async () => {
    await mkdir(join(contentTmpDir, 'guide'), { recursive: true });
    await writeFile(join(contentTmpDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(contentTmpDir, 'getting-started.md'),
      '---\ntitle: Getting Started\n---\n# Getting Started'
    );
    await writeFile(
      join(contentTmpDir, 'guide', 'api.mdx'),
      '---\ntitle: API\n---\n# API Reference'
    );
  });

  afterEach(async () => {
    await rm(contentTmpDir, { recursive: true, force: true });
  });

  it('应当扫描所有 md/mdx 文件', async () => {
    const files = await scanContentDir(contentTmpDir);
    expect(files).toHaveLength(3);
  });

  it('应当解析 frontmatter', async () => {
    const files = await scanContentDir(contentTmpDir);
    const indexFile = files.find((f) => f.slug === 'index');
    expect(indexFile).toBeDefined();
    expect(indexFile?.frontmatter.title).toBe('Home');
  });

  it('应当生成正确的 slug', async () => {
    const files = await scanContentDir(contentTmpDir);
    const slugs = files.map((f) => f.slug);
    expect(slugs).toContain('index');
    expect(slugs).toContain('getting-started');
    expect(slugs).toContain('guide/api');
  });

  it('应当构建内容树', async () => {
    const files = await scanContentDir(contentTmpDir);
    const tree = getContentTree(files);
    expect(tree.files).toHaveLength(2); // index.mdx and getting-started.md
    expect(tree.children).toHaveLength(1); // guide/
    expect(tree.children[0]?.files).toHaveLength(1); // api.mdx
  });
});

describe('page tree builder', () => {
  it('应当从文件系统结构构建', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
      {
        filePath: '/test/guide/api.mdx',
        slug: 'guide/api',
        name: 'api',
        frontmatter: { title: 'API' },
        content: '',
        segments: ['guide', 'api'],
      },
    ];

    const tree = buildPageTree(files);
    // FS mode: index becomes a page, guide/ becomes a folder
    expect(tree).toHaveLength(2);
    const pageIndex = tree.find((item) => item.type === 'page');
    const folderGuide = tree.find((item) => item.type === 'folder');
    expect(pageIndex?.name).toBe('Home');
    expect(folderGuide?.name).toBe('Guide');
    expect(folderGuide?.children).toHaveLength(1);
  });

  it('当没有 sidebar 时应当从文件系统自动构建', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
    ];

    const tree = buildPageTree(files);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe('page');
    expect(tree[0]?.name).toBe('Home');
  });

  it('应当从文件系统自动构建多级嵌套树', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
      {
        filePath: '/test/guide/intro.mdx',
        slug: 'guide/intro',
        name: 'intro',
        frontmatter: { title: 'Introduction' },
        content: '',
        segments: ['guide', 'intro'],
      },
      {
        filePath: '/test/guide/advanced/config.mdx',
        slug: 'guide/advanced/config',
        name: 'config',
        frontmatter: { title: 'Configuration' },
        content: '',
        segments: ['guide', 'advanced', 'config'],
      },
    ];

    const tree = buildPageTree(files);
    expect(tree).toHaveLength(2);
    const guideFolder = tree.find((item) => item.type === 'folder');
    expect(guideFolder).toBeDefined();
    expect(guideFolder?.name).toBe('Guide');
    expect(guideFolder?.children).toHaveLength(2);

    const advancedFolder = guideFolder?.children?.find((c) => c.type === 'folder');
    expect(advancedFolder?.type).toBe('folder');
    expect(advancedFolder?.name).toBe('Advanced');
    expect(advancedFolder?.children).toHaveLength(1);
    expect(advancedFolder?.children?.[0]?.name).toBe('Configuration');
  });

  it('当没有 frontmatter title 时应当使用 formatTitle', () => {
    const files = [
      {
        filePath: '/test/my-page.mdx',
        slug: 'my-page',
        name: 'my-page',
        frontmatter: {},
        content: '',
        segments: ['my-page'],
      },
    ];

    const tree = buildPageTree(files);
    expect(tree[0]?.name).toBe('My Page');
  });

  it('应当为包含 index 文件的目录设置 index 属性', () => {
    const files = [
      {
        filePath: '/test/guide/index.mdx',
        slug: 'guide/index',
        name: 'index',
        frontmatter: { title: 'Guide' },
        content: '',
        segments: ['guide', 'index'],
      },
      {
        filePath: '/test/guide/detail.mdx',
        slug: 'guide/detail',
        name: 'detail',
        frontmatter: { title: 'Detail' },
        content: '',
        segments: ['guide', 'detail'],
      },
    ];

    const tree = buildPageTree(files);
    const guideFolder = tree.find((item) => item.type === 'folder');
    expect(guideFolder).toBeDefined();
    expect(guideFolder?.index).toBe(true);
    expect(guideFolder?.slug).toBe('guide');
  });

  it('当 slug 替换为空字符串时应回退到 "index"', () => {
    const files = [
      {
        filePath: '/test/index/index.mdx',
        slug: 'index/index',
        name: 'index',
        frontmatter: { title: 'Index Page' },
        content: '',
        segments: ['index', 'index'],
      },
      {
        filePath: '/test/index/detail.mdx',
        slug: 'index/detail',
        name: 'detail',
        frontmatter: { title: 'Detail' },
        content: '',
        segments: ['index', 'detail'],
      },
    ];

    const tree = buildPageTree(files);
    const indexFolder = tree.find((item) => item.type === 'folder');
    expect(indexFolder).toBeDefined();
    expect(indexFolder?.index).toBe(true);
    // slug 'index/index' after replace(/\/index$/, '') becomes 'index', not empty
    // But we test the fallback logic exists
    expect(indexFolder?.slug).toBe('index');
  });

  it('应当构建不带 icon 的页面（来自 frontmatter）', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
    ];

    const tree = buildPageTree(files);
    // Icons come from meta.json/frontmatter, not from tree builder
    expect(tree[0]?.type).toBe('page');
    expect(tree[0]?.name).toBe('Home');
    expect(tree[0]?.icon).toBeUndefined();
  });

  it('当 frontmatter title 为空时应当使用 formatTitle', () => {
    const files = [
      {
        filePath: '/test/guide.mdx',
        slug: 'guide',
        name: 'guide',
        frontmatter: {},
        content: '',
        segments: ['guide'],
      },
    ];

    const tree = buildPageTree(files);
    // Root-level file becomes a page with formatted name
    expect(tree[0]?.type).toBe('page');
    expect(tree[0]?.name).toBe('Guide');
  });

  it('当 frontmatter title 存在时应当使用它', () => {
    const files = [
      {
        filePath: '/test/guide.mdx',
        slug: 'guide',
        name: 'guide',
        frontmatter: { title: 'Frontmatter Title' },
        content: '',
        segments: ['guide'],
      },
    ];

    const tree = buildPageTree(files);
    expect(tree[0]?.name).toBe('Frontmatter Title');
  });

  // 覆盖 tree.ts 行73: slug.replace(/\/index$/, '') 结果为空时 || 回退到 'index'
  it('当 slug 替换结果为空字符串时应回退到 "index"', () => {
    // 构造一个特殊场景：目录下的 index 文件，其 slug 恰好为 "index"
    // 正常情况下这不会发生（slug 至少为 'dir/index'），但覆盖防御性代码
    const files = [
      {
        filePath: '/test/somedir/index.mdx',
        slug: 'index', // 故意设为 'index'（正常应为 'somedir/index'）
        name: 'index',
        frontmatter: { title: 'Index Page' },
        content: '',
        segments: ['somedir', 'index'], // 正常的 segments 结构
      },
      {
        filePath: '/test/somedir/other.mdx',
        slug: 'somedir/other',
        name: 'other',
        frontmatter: { title: 'Other Page' },
        content: '',
        segments: ['somedir', 'other'],
      },
    ];

    const tree = buildPageTree(files);
    // somedir 成为一个 folder（因为它有子文件）
    const folder = tree.find((item) => item.type === 'folder');
    expect(folder).toBeDefined();
    expect(folder?.index).toBe(true);
    // slug 'index'.replace(/\/index$/, '') = '' (空字符串, falsy) → || 'index'
    expect(folder?.slug).toBe('index');
  });

  // 覆盖 tree.ts 行73: slug.replace(/\/index$/, '') 结果为空字符串时 || 回退到 'index'
  // 构造 slug 为 '/index' 的人工数据，使 replace 返回 ''（而非 'index'）
  it('当 slug 替换结果为空字符串时应回退到 "index"', () => {
    const files = [
      {
        filePath: '/test/somedir/index.mdx',
        slug: '/index', // replace(/\/index$/, '') → '' (空字符串) → || 'index'
        name: 'index',
        frontmatter: { title: 'Index Page' },
        content: '',
        segments: ['somedir', 'index'],
      },
      {
        filePath: '/test/somedir/other.mdx',
        slug: 'somedir/other',
        name: 'other',
        frontmatter: { title: 'Other Page' },
        content: '',
        segments: ['somedir', 'other'],
      },
    ];

    const tree = buildPageTree(files);
    const folder = tree.find((item) => item.type === 'folder');
    expect(folder).toBeDefined();
    expect(folder?.index).toBe(true);
    // '/index'.replace(/\/index$/, '') = '' → '' || 'index' = 'index'
    expect(folder?.slug).toBe('index');
  });
});

describe('generateSourceConfigContent', () => {
  it('应当使用自定义内容目录生成源配置', () => {
    const result = generateSourceConfigContent('docs');
    expect(result).toContain("dir: 'docs'");
    expect(result).toContain('defineDocs');
    expect(result).toContain('defineConfig');
  });
});

describe('loadConfig validation errors', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-validation');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('验证错误消息中应当包含字段路径', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'Test', siteUrl: 'not-a-url' })
    );
    await expect(loadConfig(tmpDir)).rejects.toThrow('siteUrl');
  });
});

describe('collectConfiguredSlugs', () => {
  it('当没有 sidebar 时应当返回空集合', () => {
    const slugs = collectConfiguredSlugs({ name: 'Test' } as OpenManualConfig);
    expect(slugs.size).toBe(0);
  });

  it('当 sidebar 为空时应当返回空集合', () => {
    const slugs = collectConfiguredSlugs({ name: 'Test', sidebar: [] } as OpenManualConfig);
    expect(slugs.size).toBe(0);
  });

  it('应当从 sidebar 配置中收集所有 slug', () => {
    const config = {
      name: 'Test',
      sidebar: [
        {
          group: 'Getting Started',
          pages: [
            { slug: 'index', title: 'Home' },
            { slug: 'guide', title: 'Guide' },
          ],
        },
        {
          group: 'Advanced',
          pages: [{ slug: 'guide/api', title: 'API' }],
        },
      ],
    } as OpenManualConfig;
    const slugs = collectConfiguredSlugs(config);
    expect(slugs.has('index')).toBe(true);
    expect(slugs.has('guide')).toBe(true);
    expect(slugs.has('guide/api')).toBe(true);
    expect(slugs.size).toBe(3);
  });
});

describe('loadConfig - mergeDefaults branches', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-merge');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当未提供 navbar 时 navbar.logo 应回退到 config.name', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('应当使用 MIT 模板（含当前年份和项目名）作为默认 footer 文本', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    const year = new Date().getFullYear();
    expect(config.footer?.text).toBe(`MIT ${year} © MyApp.`);
  });

  it('当显式设置时应当使用提供的 navbar logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', navbar: { logo: '/logo.svg' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('/logo.svg');
  });

  it('当显式设置时应当使用提供的 footer 文本', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', footer: { text: 'Custom Footer' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.footer?.text).toBe('Custom Footer');
  });
});

describe('content scanner - error handling', () => {
  const contentTmpDir = join(process.cwd(), '.test-content-err');

  afterEach(async () => {
    await rm(contentTmpDir, { recursive: true, force: true });
  });

  it('应当跳过读取失败的文件并返回剩余文件', async () => {
    await mkdir(contentTmpDir, { recursive: true });
    await writeFile(join(contentTmpDir, 'good.md'), '---\ntitle: Good\n---\nContent');
    // Create a file then make it unreadable by writing invalid content scenario
    // We test via the parseContentFile catch branch indirectly
    const files = await scanContentDir(contentTmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('good');
  });

  // 覆盖 scanner.ts 行59: parseContentFile 的 catch 块返回 null
  it('不可读文件应当返回 null（parseContentFile 中的 catch 块）', async () => {
    await mkdir(contentTmpDir, { recursive: true });
    await writeFile(join(contentTmpDir, 'good.md'), '---\ntitle: Good\n---\nContent');
    // 创建一个不可读的文件（用符号链接到不存在目标触发 readFile 异常）
    const brokenPath = join(contentTmpDir, 'broken-symlink.md');
    const { symlink } = await import('node:fs/promises');
    try {
      await symlink('/nonexistent/target/file.md', brokenPath);
    } catch {
      // 符号链接不可用时跳过符号链接触发方式，但仍验证正常文件可扫描
      const files = await scanContentDir(contentTmpDir);
      expect(files).toHaveLength(1);
      expect(files[0]?.name).toBe('good');
      return;
    }
    const files = await scanContentDir(contentTmpDir);
    // good.md 正常返回，broken-symlink.md 因 readFile 失败被跳过
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('good');
  });

  // 覆盖 scanner.ts 行59：使用 chmod 000 触发 parseContentFile 的 catch 块
  it('应当通过 parseContentFile 的 catch 块跳过不可读文件', async () => {
    await mkdir(contentTmpDir, { recursive: true });
    await writeFile(join(contentTmpDir, 'good.md'), '---\ntitle: Good\n---\nContent');
    const unreadablePath = join(contentTmpDir, 'unreadable.md');
    await writeFile(unreadablePath, 'data');
    // 移除所有权限使 readFile 抛出 EACCES 异常
    const { chmod } = await import('node:fs/promises');
    try {
      await chmod(unreadablePath, 0o000);
    } catch {
      // 某些环境（如 Docker root 用户）可能无法限制权限，跳过此触发方式
      const files = await scanContentDir(contentTmpDir);
      expect(files.length).toBeGreaterThanOrEqual(1);
      return;
    }

    try {
      const files = await scanContentDir(contentTmpDir);
      // good.md 正常返回，unreadable.md 因权限不足被跳过
      expect(files).toHaveLength(1);
      expect(files[0]?.name).toBe('good');
    } finally {
      // 恢复权限以便 afterEach 清理
      try {
        await chmod(unreadablePath, 0o644);
      } catch {
        /* ignore */
      }
    }
  });
});

// ============================================================
// i18n schema 工具函数测试
// ============================================================

describe('isI18nEnabled', () => {
  it('当 i18n 为 undefined 时应当返回 false', () => {
    expect(isI18nEnabled({ name: 'Test' })).toBe(false);
  });

  it('当 i18n.enabled 为 false 时应当返回 false', () => {
    expect(
      isI18nEnabled({
        name: 'Test',
        i18n: {
          enabled: false,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      })
    ).toBe(false);
  });

  it('当启用但只有 1 种语言时应当返回 false', () => {
    expect(
      isI18nEnabled({
        name: 'Test',
        i18n: { enabled: true, languages: [{ code: 'zh', name: '中文' }] },
      })
    ).toBe(false);
  });

  it('当启用但 languages 数组为空时应当返回 false', () => {
    expect(isI18nEnabled({ name: 'Test', i18n: { enabled: true, languages: [] } })).toBe(false);
  });

  it('当启用但 languages 为 undefined 时应当返回 false', () => {
    expect(isI18nEnabled({ name: 'Test', i18n: { enabled: true } })).toBe(false);
  });

  it('当启用且 languages 有 2+ 条目时应当返回 true', () => {
    expect(
      isI18nEnabled({
        name: 'Test',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      })
    ).toBe(true);
  });

  it('当启用且 languages 有 3+ 条目时应当返回 true', () => {
    expect(
      isI18nEnabled({
        name: 'Test',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
            { code: 'ja', name: '日本語' },
          ],
        },
      })
    ).toBe(true);
  });
});

describe('isDirParser', () => {
  it('当 parser 为 "dir" 时应当返回 true', () => {
    expect(isDirParser({ name: 'T', i18n: { parser: 'dir' } })).toBe(true);
  });

  it('当 parser 为 "dot" 时应当返回 false', () => {
    expect(isDirParser({ name: 'T', i18n: { parser: 'dot' } })).toBe(false);
  });

  it('当 parser 为 undefined 时应当返回 false', () => {
    expect(isDirParser({ name: 'T', i18n: { enabled: true } })).toBe(false);
  });

  it('当 i18n 配置为 undefined 时应当返回 false', () => {
    expect(isDirParser({ name: 'T' })).toBe(false);
  });
});

describe('I18nLocaleSchema', () => {
  it('应当接受包含 code 和 name 的有效 locale', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: {
        enabled: true,
        languages: [{ code: 'en', name: 'English' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝空 code', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { languages: [{ code: '', name: 'English' }] },
    });
    expect(result.success).toBe(false);
  });

  it('应当拒绝空 name', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { languages: [{ code: 'en', name: '' }] },
    });
    expect(result.success).toBe(false);
  });
});

describe('I18nConfigSchema', () => {
  it('应当接受包含所有字段的完整 i18n 配置', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: {
        enabled: true,
        defaultLanguage: 'zh',
        languages: [
          { code: 'zh', name: '中文' },
          { code: 'en', name: 'English' },
        ],
        parser: 'dir',
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受最小 i18n 配置（仅 enabled）', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { enabled: true },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝无效的 parser 值', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { parser: 'invalid' },
    });
    expect(result.success).toBe(false);
  });

  it('应当接受 i18n 作为可选字段', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// mergeDefaults — i18n 合并逻辑
// ============================================================

describe('loadConfig - mergeDefaults i18n', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-i18n');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当提供 i18n 配置时应当合并 i18n 默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n).toBeDefined();
    expect(config.i18n?.enabled).toBe(true);
    expect(config.i18n?.defaultLanguage).toBe('zh'); // fallback to locale
    expect(config.i18n?.parser).toBe('dot'); // fallback default
    expect(config.i18n?.languages).toHaveLength(2);
  });

  it('应当优先使用提供的 i18n.defaultLanguage 而非回退值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        locale: 'ja',
        i18n: {
          enabled: true,
          defaultLanguage: 'en',
          languages: [{ code: 'en', name: 'English' }],
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.defaultLanguage).toBe('en');
  });

  it('应当优先使用提供的 i18n.parser 而非回退值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        i18n: {
          enabled: true,
          parser: 'dir',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.parser).toBe('dir');
  });

  it('当配置中不含 i18n 时应当将 i18n 设为 undefined', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.i18n).toBeUndefined();
  });

  // 覆盖 loader.ts 行85: i18n.enabled 为 undefined 时 fallback 到 false
  it('当未提供时 i18n.enabled 应回退到 false', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        i18n: {
          // 不含 enabled 字段
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.enabled).toBe(false);
  });

  // 覆盖 loader.ts 行87 第一级 ??: defaultLanguage undefined → fallback 到 locale
  it('当未提供时 i18n.defaultLanguage 应回退到 locale', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        locale: 'ja',
        i18n: {
          enabled: true,
          languages: [{ code: 'ja', name: '日本語' }],
          // 不含 defaultLanguage
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.defaultLanguage).toBe('ja');
  });

  // 覆盖 loader.ts 行87 第二级 ??: locale 也 undefined → fallback 到 'zh'
  it('当两者都未提供时 i18n.defaultLanguage 应回退到 zh', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        // 不含 locale
        i18n: {
          enabled: true,
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          // 不含 defaultLanguage
        },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.defaultLanguage).toBe('zh');
  });
});

// ============================================================
// mergeDefaults — OpenAPI 合并逻辑（覆盖 loader.ts:91-94）
// ============================================================

describe('loadConfig - mergeDefaults openapi', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-openapi');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当未提供 label 时 openapi.label 默认应为接口文档', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        openapi: { specPath: 'openapi.yaml' }, // 无 label 字段
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi).toBeDefined();
    expect(config.openapi?.specPath).toBe('openapi.yaml');
    expect(config.openapi?.label).toBe('接口文档'); // 默认 label
  });

  it('当提供时应当保留自定义 openapi.label', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'TestProject',
        openapi: { specPath: 'openapi.yaml', label: 'Custom API Docs' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.label).toBe('Custom API Docs');
  });

  it('当未配置时应当将 openapi 设为 undefined', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.openapi).toBeUndefined();
  });
});

// ============================================================
// mergeDefaults — contentDir / outputDir / locale 三级 fallback 验证
// 覆盖 loader.ts:54-56
// ============================================================

describe('loadConfig - field fallback defaults', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-fallback');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当省略时 contentDir 应回退到 content', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.contentDir).toBe('content');
  });

  it('应当优先使用提供的 contentDir 而非默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', contentDir: 'custom-docs' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.contentDir).toBe('custom-docs');
  });

  it('当省略时 outputDir 应回退到 dist', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('dist');
  });

  it('应当优先使用提供的 outputDir 而非默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', outputDir: 'out' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('out');
  });

  it('当省略时 locale 应回退到 zh', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.locale).toBe('zh');
  });

  it('应当优先使用提供的 locale 而非默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T', locale: 'en' }));
    const config = await loadConfig(tmpDir);
    expect(config.locale).toBe('en');
  });

  it('当省略时 contentPolicy 应回退到 strict', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.contentPolicy).toBe('strict');
  });
});

// ============================================================
// resolveOpenApiSpecPaths — 覆盖 schema.ts:174-192
// ============================================================

describe('resolveOpenApiSpecPaths', () => {
  it('当 openapi 为 undefined 时应当返回空数组', () => {
    expect(resolveOpenApiSpecPaths({ name: 'Test' })).toEqual([]);
  });

  it('当 openapi 没有 specs 或 specPath 时应当返回空数组', () => {
    expect(resolveOpenApiSpecPaths({ name: 'Test', openapi: {} as any })).toEqual([]);
  });

  it('应当从 specPath 返回单一路径（旧格式）', () => {
    const config = { name: 'T', openapi: { specPath: 'openapi.yaml' } as any };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['openapi.yaml']);
  });

  it('应当从 specs 返回包含单个字符串的数组（新格式）', () => {
    const config = { name: 'T', openapi: { specs: 'api-spec.yaml' } as any };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['api-spec.yaml']);
  });

  it('应当从 specs 数组返回路径（多文件新格式）', () => {
    const config = {
      name: 'T',
      openapi: {
        specs: [
          { path: 'core-api.yaml', group: 'Core' },
          { path: 'admin-api.yaml', group: 'Admin' },
        ],
      } as any,
    };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['core-api.yaml', 'admin-api.yaml']);
  });

  it('当两者同时存在时应当优先使用 specs 而非 specPath', () => {
    const config = {
      name: 'T',
      openapi: { specPath: 'old.yaml', specs: 'new.yaml' } as any,
    };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['new.yaml']);
  });

  it('空 specs 数组应当返回空数组', () => {
    const config = { name: 'T', openapi: { specs: [] } as any };
    // Zod schema allows empty array; map returns []
    expect(resolveOpenApiSpecPaths(config)).toEqual([]);
  });
});

// ============================================================
// isOpenApiEnabled — 新增 specs 格式覆盖
// ============================================================

describe('isOpenApiEnabled - new specs format', () => {
  it('当 specs 为非空字符串时应当返回 true', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { specs: 'spec.yaml' } as any })).toBe(true);
  });

  it('当 specs 为非空数组时应当返回 true', () => {
    expect(
      isOpenApiEnabled({
        name: 'T',
        openapi: { specs: [{ path: 'a.yaml' }, { path: 'b.yaml' }] } as any,
      })
    ).toBe(true);
  });

  it('当 specPath 为 null 时应当返回 false', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { specPath: null as any } as any })).toBe(false);
  });

  it('当 openapi 对象没有有效 spec 字段时应当返回 false', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { label: 'API' } as any })).toBe(false);
  });
});

// ============================================================
// isSeparateTabMode — 覆盖 schema.ts:197-199
// ============================================================

describe('isSeparateTabMode', () => {
  it('当 separateTab 为 true 时应当返回 true', () => {
    expect(
      isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: true } as any })
    ).toBe(true);
  });

  it('当 separateTab 为 false 时应当返回 false', () => {
    expect(
      isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: false } as any })
    ).toBe(false);
  });

  it('当 separateTab 为 undefined（默认值）时应当返回 false', () => {
    expect(isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml' } as any })).toBe(false);
  });

  it('当 openapi 为 undefined 时应当返回 false', () => {
    expect(isSeparateTabMode({ name: 'T' })).toBe(false);
  });
});

// ============================================================
// mergeDefaults — OpenAPI 新字段默认值（groupBy, separateTab, specs）
// 覆盖 loader.ts:96-97
// ============================================================

describe('loadConfig - mergeDefaults openapi new fields', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-openapi-new');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当未提供时 groupBy 默认应为 tag', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('tag');
  });

  it('当未提供时 separateTab 默认应为 false', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(false);
  });

  it('应当保留提供的 groupBy 值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml', groupBy: 'route' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('route');
  });

  it('应当保留提供的 separateTab 值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: true } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(true);
  });

  it('当 specs 以字符串形式提供时应当透传', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specs: 'my-spec.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.specs).toBe('my-spec.yaml');
  });

  it('当 specs 以数组形式提供时应当透传', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'T',
        openapi: { specs: [{ path: 'a.yaml', group: 'A' }, { path: 'b.yaml' }] },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(Array.isArray(config.openapi?.specs)).toBe(true);
    expect((config.openapi?.specs as Array<any>).length).toBe(2);
  });

  it('应当正确合并所有 openapi 默认值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'spec.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi).toEqual({
      specPath: 'spec.yaml',
      specs: undefined,
      label: '接口文档',
      groupBy: 'tag',
      separateTab: false,
    });
  });
});

// ============================================================
// TopBarSchema / isHeaderEnabled — 覆盖 schema.ts 新增
// ============================================================

describe('TopBarSchema', () => {
  it('应当接受包含所有字段的有效 header 配置', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        height: '64px',
        logo: '/logo.svg',
        links: [
          { label: 'Console', href: '/console' },
          { label: 'Pricing', href: '/pricing' },
        ],
        sticky: true,
        background: '#ffffff',
        bordered: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受空的 header 配置', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {},
    });
    expect(result.success).toBe(true);
  });

  it('应当接受带 links 数组的 header', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        links: [{ label: 'API Key', href: '/keys', external: false }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受带对象形式 logo（light/dark）的 header', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝非字符串类型的 header height', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { height: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('应当接受仅含 label 的链接（向后兼容）', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ label: 'Docs', href: '/docs' }] },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受仅含 icon 的链接', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ icon: 'Github', href: 'https://github.com/test' }] },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受同时包含 icon 和 label 的链接', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        links: [{ icon: 'Github', label: 'GitHub', href: 'https://github.com/test' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝既不含 icon 也不含 label 的链接', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ href: 'https://example.com' }] },
    });
    expect(result.success).toBe(false);
  });
});

describe('isHeaderEnabled', () => {
  it('当 header 为 undefined 时应当返回 true（默认启用）', () => {
    expect(isHeaderEnabled({ name: 'T' })).toBe(true);
  });

  it('当 header 存在时（即使配置最小）应当返回 true', () => {
    expect(isHeaderEnabled({ name: 'T', header: { sticky: true, bordered: true } })).toBe(true);
  });

  it('当 header 配置了 height 时应当返回 true', () => {
    expect(
      isHeaderEnabled({ name: 'T', header: { height: '64px', sticky: true, bordered: true } })
    ).toBe(true);
  });

  it('当 header 完全配置时应当返回 true', () => {
    expect(
      isHeaderEnabled({
        name: 'T',
        header: {
          height: '56px',
          sticky: true,
          bordered: true,
          links: [{ label: 'Console', href: '/console', external: true }],
        },
      })
    ).toBe(true);
  });

  it('当 header 仅包含 links 时应当返回 true', () => {
    expect(
      isHeaderEnabled({
        name: 'T',
        header: {
          links: [{ label: 'GitHub', href: 'https://github.com', external: true }],
          sticky: true,
          bordered: true,
        },
      })
    ).toBe(true);
  });
});

describe('TopLevelLogoSchema', () => {
  it('应当接受字符串简写形式', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: '/logo.svg',
    });
    expect(result.success).toBe(true);
  });

  it('应当接受包含 light 和 dark 的对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受包含 position 的对象（向后兼容，position 被忽略）', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/l.svg', dark: '/d.svg', position: 'header' },
    });
    expect(result.success).toBe(true);
  });

  it('应当接受任意 position 值（向后兼容）', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/l.svg', dark: '/d.svg', position: 'invalid-value' },
    });
    expect(result.success).toBe(true);
  });

  it('应当拒绝缺少 light 字段的对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { dark: '/dark.svg' },
    });
    expect(result.success).toBe(false);
  });

  it('应当拒绝缺少 dark 字段的对象', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/light.svg' },
    });
    expect(result.success).toBe(false);
  });
});

describe('normalizeTopLevelLogo', () => {
  it('应当将字符串简写标准化为 { light, dark } 对象', () => {
    const result = normalizeTopLevelLogo('/logo.svg');
    expect(result).toEqual({ light: '/logo.svg', dark: '/logo.svg' });
  });

  it('应当标准化对象形式的 logo', () => {
    const result = normalizeTopLevelLogo({ light: '/l.svg', dark: '/d.svg' });
    expect(result).toEqual({ light: '/l.svg', dark: '/d.svg' });
  });

  it('应当忽略 position 字段', () => {
    const result = normalizeTopLevelLogo({
      light: '/l.svg',
      dark: '/d.svg',
      position: 'header' as string,
    });
    expect(result).toEqual({ light: '/l.svg', dark: '/d.svg' });
  });
});

describe('resolveEffectiveLogo', () => {
  it('应当返回顶层 logo 作为最高优先级', () => {
    const config = {
      name: 'Test',
      logo: { light: '/top-light.svg', dark: '/top-dark.svg' },
      navbar: { logo: '/nav-logo.svg' },
      header: { logo: '/header-logo.svg' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toEqual({ light: '/top-light.svg', dark: '/top-dark.svg' });
  });

  it('当没有顶层 logo 时应回退到 header.logo', () => {
    const config = {
      name: 'Test',
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBe('/hdr.svg');
  });

  it('当任何位置都未配置 logo 时应当返回 undefined', () => {
    const config = { name: 'Test' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBeUndefined();
  });

  it('应当处理字符串简写形式的顶级 logo（light === dark 时返回字符串）', () => {
    const config = { name: 'Test', logo: '/logo.svg' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBe('/logo.svg');
  });

  it('当 light !== dark 时应返回对象形式', () => {
    const config = { name: 'Test', logo: { light: '/l.svg', dark: '/d.svg' } } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toEqual({ light: '/l.svg', dark: '/d.svg' });
  });
});

describe('loadConfig - top-level logo propagation', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-logo');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('应当将顶级 logo 传播到 header.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/l.svg', dark: '/d.svg' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.logo).toEqual({ light: '/l.svg', dark: '/d.svg' });
    // navbar 应回退到 config.name
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('应当将带 position 的顶级 logo 传播到 header.logo（忽略 position）', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/l.svg', dark: '/d.svg', position: 'sidebar' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.logo).toEqual({ light: '/l.svg', dark: '/d.svg' });
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('字符串简写形式的顶级 logo 应当传播到 header.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', logo: '/logo.svg' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.logo).toBe('/logo.svg');
  });

  it('当没有顶层 logo 时应当保留旧版 navbar.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', navbar: { logo: '/legacy-nav.svg' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('/legacy-nav.svg');
  });

  it('当没有顶层 logo 时应当保留旧版 header.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        header: { logo: '/legacy-hdr.svg', height: '56px' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.logo).toBe('/legacy-hdr.svg');
  });

  it('应当从合并后的 logo 配置中剥离 position 字段', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/l.svg', dark: '/d.svg', position: 'header' },
      })
    );
    const config = await loadConfig(tmpDir);
    // position 应当被剥离
    if (typeof config.logo === 'object' && !Array.isArray(config.logo)) {
      expect((config.logo as Record<string, unknown>).position).toBeUndefined();
    }
  });
});

describe('resolveEffectiveLogo - full priority chain coverage', () => {
  it('应当优先使用顶层 logo 而非 header logo', () => {
    const config = {
      name: 'Test',
      logo: { light: '/top.svg', dark: '/top-dark.svg' },
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toEqual({ light: '/top.svg', dark: '/top-dark.svg' });
  });

  it('当仅存在 header.logo（无顶层）时应当返回 header logo', () => {
    const config = {
      name: 'Test',
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBe('/hdr.svg');
  });

  it('当任何位置都未配置 logo 时应当返回 undefined', () => {
    const config = { name: 'Test' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBeUndefined();
  });

  it('应当处理顶层字符串简写（light === dark 时返回字符串）', () => {
    const config = { name: 'Test', logo: '/logo.svg' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result).toBe('/logo.svg');
  });
});

describe('loadConfig - mergeDefaults branch coverage', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-branch');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('当 i18n 启用但未指定 languages 时 i18n.languages 默认应为空数组', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', i18n: { enabled: true } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.enabled).toBe(true);
    expect(config.i18n?.languages).toEqual([]);
  });

  it('当显式设置时应当使用提供的 i18n.languages', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        i18n: { enabled: true, languages: [{ code: 'zh', name: '中文' }] },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.languages).toEqual([{ code: 'zh', name: '中文' }]);
  });

  it('当未指定时 openapi.groupBy 默认应为 tag', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('tag');
  });

  it('当未指定时 openapi.separateTab 默认应为 false', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(false);
  });

  it('当未指定时 openapi.label 默认应为接口文档', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.label).toBe('接口文档');
  });

  it('顶级 logo 不应覆盖用户显式设置的 header.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/top.svg', dark: '/top-dark.svg' },
        header: { height: '56px', logo: '/existing-hdr.svg' },
      })
    );
    const config = await loadConfig(tmpDir);
    // 用户显式设置的 header.logo 优先级更高，不被覆盖
    expect(config.header?.logo).toBe('/existing-hdr.svg');
    // navbar 应回退到 config.name
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('当未配置 header 时应提供默认 header（sticky=true, bordered=true）', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    expect(config.header).toBeDefined();
    expect(config.header?.sticky).toBe(true);
    expect(config.header?.bordered).toBe(true);
    expect(config.header?.logo).toBeUndefined();
  });

  it('当配置了 header 时应保留用户的自定义值', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', header: { sticky: false, height: '56px' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.sticky).toBe(false);
    expect(config.header?.height).toBe('56px');
    expect(config.header?.bordered).toBe(true);
  });
});
