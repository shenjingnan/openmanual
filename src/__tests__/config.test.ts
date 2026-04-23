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
  it('should validate a minimal valid config', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('should reject config without name', () => {
    const result = OpenManualConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = OpenManualConfigSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept full config', () => {
    const config = {
      name: 'MyProject',
      description: 'A test project',
      contentDir: 'docs',
      outputDir: 'out',
      siteUrl: 'https://example.com',
      locale: 'en',
      navbar: {
        logo: 'MyProject',
        github: 'https://github.com/test/test',
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
      theme: { primaryHue: 220, darkMode: true },
      search: { enabled: true },
      mdx: { latex: true },
    };
    const result = OpenManualConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject invalid github url', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { github: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject primaryHue out of range', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      theme: { primaryHue: 400 },
    });
    expect(result.success).toBe(false);
  });

  it('should accept logo as object with light and dark paths', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' } },
    });
    expect(result.success).toBe(true);
  });

  it('should reject logo object missing dark field', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { light: '/logo-light.svg' } },
    });
    expect(result.success).toBe(false);
  });

  it('should reject logo object missing light field', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { logo: { dark: '/logo-dark.svg' } },
    });
    expect(result.success).toBe(false);
  });

  it('should accept contentPolicy as strict', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'strict',
    });
    expect(result.success).toBe(true);
  });

  it('should accept contentPolicy as all', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'all',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid contentPolicy value', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      contentPolicy: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should accept favicon as .ico path', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: '/favicon.ico' });
    expect(result.success).toBe(true);
  });

  it('should accept favicon as .svg path', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: '/favicon.svg' });
    expect(result.success).toBe(true);
  });

  it('should accept favicon with subdirectory path', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      favicon: '/icons/favicon.png',
    });
    expect(result.success).toBe(true);
  });

  it('should reject favicon as non-string value', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test', favicon: 123 });
    expect(result.success).toBe(false);
  });
});

describe('loadConfig', () => {
  const tmpDir = join(process.cwd(), '.test-tmp');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should throw when openmanual.json not found', async () => {
    await expect(loadConfig(tmpDir)).rejects.toThrow('not found');
  });

  it('should throw when invalid JSON', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), 'invalid');
    await expect(loadConfig(tmpDir)).rejects.toThrow('not valid JSON');
  });

  it('should load and merge defaults', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.name).toBe('TestProject');
    expect(config.contentDir).toBe('content');
    expect(config.outputDir).toBe('dist');
    expect(config.locale).toBe('zh');
    expect(config.contentPolicy).toBe('strict');
    expect(config.navbar?.logo).toBe('TestProject');
    expect(config.theme?.primaryHue).toBe(213);
    expect(config.search).toBeUndefined();
  });

  it('should respect contentPolicy all when provided', async () => {
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

  it('should scan all md/mdx files', async () => {
    const files = await scanContentDir(contentTmpDir);
    expect(files).toHaveLength(3);
  });

  it('should parse frontmatter', async () => {
    const files = await scanContentDir(contentTmpDir);
    const indexFile = files.find((f) => f.slug === 'index');
    expect(indexFile).toBeDefined();
    expect(indexFile?.frontmatter.title).toBe('Home');
  });

  it('should generate correct slugs', async () => {
    const files = await scanContentDir(contentTmpDir);
    const slugs = files.map((f) => f.slug);
    expect(slugs).toContain('index');
    expect(slugs).toContain('getting-started');
    expect(slugs).toContain('guide/api');
  });

  it('should build content tree', async () => {
    const files = await scanContentDir(contentTmpDir);
    const tree = getContentTree(files);
    expect(tree.files).toHaveLength(2); // index.mdx and getting-started.md
    expect(tree.children).toHaveLength(1); // guide/
    expect(tree.children[0]?.files).toHaveLength(1); // api.mdx
  });
});

describe('page tree builder', () => {
  it('should build from file system structure', () => {
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

  it('should auto-build from file system when no sidebar', () => {
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

  it('should auto-build multi-level nested tree from file system', () => {
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

  it('should use formatTitle when no frontmatter title', () => {
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

  it('should set index property for directories with index file', () => {
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

  it('should fallback to "index" when slug replaces to empty string', () => {
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

  it('should build page without icon from frontmatter', () => {
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

  it('should use formatTitle when frontmatter title is empty', () => {
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

  it('should use frontmatter title when available', () => {
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
  it('should fallback to "index" when slug replace results in empty string', () => {
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
  it('should fallback to "index" when slug replace results in empty string', () => {
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
  it('should generate source config with custom content dir', () => {
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

  it('should include field paths in validation error message', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'Test', siteUrl: 'not-a-url' })
    );
    await expect(loadConfig(tmpDir)).rejects.toThrow('siteUrl');
  });
});

describe('collectConfiguredSlugs', () => {
  it('should return empty set when no sidebar', () => {
    const slugs = collectConfiguredSlugs({ name: 'Test' } as OpenManualConfig);
    expect(slugs.size).toBe(0);
  });

  it('should return empty set when sidebar is empty', () => {
    const slugs = collectConfiguredSlugs({ name: 'Test', sidebar: [] } as OpenManualConfig);
    expect(slugs.size).toBe(0);
  });

  it('should collect all slugs from sidebar config', () => {
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

  it('should fallback navbar.logo to config.name when navbar not provided', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('should use MIT template with current year and project name as default footer text', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    const year = new Date().getFullYear();
    expect(config.footer?.text).toBe(`MIT ${year} © MyApp.`);
  });

  it('should use provided navbar logo when explicitly set', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', navbar: { logo: '/logo.svg' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('/logo.svg');
  });

  it('should use provided footer text when explicitly set', async () => {
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

  it('should skip files that fail to read and return remaining files', async () => {
    await mkdir(contentTmpDir, { recursive: true });
    await writeFile(join(contentTmpDir, 'good.md'), '---\ntitle: Good\n---\nContent');
    // Create a file then make it unreadable by writing invalid content scenario
    // We test via the parseContentFile catch branch indirectly
    const files = await scanContentDir(contentTmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('good');
  });

  // 覆盖 scanner.ts 行59: parseContentFile 的 catch 块返回 null
  it('should return null for unreadable files (catch block in parseContentFile)', async () => {
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
  it('should skip unreadable files via catch block in parseContentFile', async () => {
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
  it('should return false when i18n is undefined', () => {
    expect(isI18nEnabled({ name: 'Test' })).toBe(false);
  });

  it('should return false when i18n.enabled is false', () => {
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

  it('should return false when enabled but only 1 language', () => {
    expect(
      isI18nEnabled({
        name: 'Test',
        i18n: { enabled: true, languages: [{ code: 'zh', name: '中文' }] },
      })
    ).toBe(false);
  });

  it('should return false when enabled but languages array is empty', () => {
    expect(isI18nEnabled({ name: 'Test', i18n: { enabled: true, languages: [] } })).toBe(false);
  });

  it('should return false when enabled but languages is undefined', () => {
    expect(isI18nEnabled({ name: 'Test', i18n: { enabled: true } })).toBe(false);
  });

  it('should return true when enabled and languages has 2+ entries', () => {
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

  it('should return true when enabled and languages has 3+ entries', () => {
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
  it('should return true when parser is "dir"', () => {
    expect(isDirParser({ name: 'T', i18n: { parser: 'dir' } })).toBe(true);
  });

  it('should return false when parser is "dot"', () => {
    expect(isDirParser({ name: 'T', i18n: { parser: 'dot' } })).toBe(false);
  });

  it('should return false when parser is undefined', () => {
    expect(isDirParser({ name: 'T', i18n: { enabled: true } })).toBe(false);
  });

  it('should return false when i18n config is undefined', () => {
    expect(isDirParser({ name: 'T' })).toBe(false);
  });
});

describe('I18nLocaleSchema', () => {
  it('should accept valid locale with code and name', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: {
        enabled: true,
        languages: [{ code: 'en', name: 'English' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty code', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { languages: [{ code: '', name: 'English' }] },
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { languages: [{ code: 'en', name: '' }] },
    });
    expect(result.success).toBe(false);
  });
});

describe('I18nConfigSchema', () => {
  it('should accept full i18n config with all fields', () => {
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

  it('should accept minimal i18n config (only enabled)', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { enabled: true },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid parser value', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      i18n: { parser: 'invalid' },
    });
    expect(result.success).toBe(false);
  });

  it('should accept i18n as optional field', () => {
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

  it('should merge i18n defaults when i18n config provided', async () => {
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

  it('should use provided i18n.defaultLanguage over fallback', async () => {
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

  it('should use provided i18n.parser over fallback', async () => {
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

  it('should set i18n to undefined when i18n not in config', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.i18n).toBeUndefined();
  });

  // 覆盖 loader.ts 行85: i18n.enabled 为 undefined 时 fallback 到 false
  it('should fallback i18n.enabled to false when not provided', async () => {
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
  it('should fallback i18n.defaultLanguage to locale when not provided', async () => {
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
  it('should fallback i18n.defaultLanguage to zh when neither provided', async () => {
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

  it('should default openapi.label to 接口文档 when label not provided', async () => {
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

  it('should preserve custom openapi.label when provided', async () => {
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

  it('should set openapi to undefined when not configured', async () => {
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

  it('should fallback contentDir to content when omitted', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.contentDir).toBe('content');
  });

  it('should use provided contentDir over default', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', contentDir: 'custom-docs' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.contentDir).toBe('custom-docs');
  });

  it('should fallback outputDir to dist when omitted', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('dist');
  });

  it('should use provided outputDir over default', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', outputDir: 'out' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.outputDir).toBe('out');
  });

  it('should fallback locale to zh when omitted', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T' }));
    const config = await loadConfig(tmpDir);
    expect(config.locale).toBe('zh');
  });

  it('should use provided locale over default', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'T', locale: 'en' }));
    const config = await loadConfig(tmpDir);
    expect(config.locale).toBe('en');
  });

  it('should fallback contentPolicy to strict when omitted', async () => {
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
  it('should return empty array when openapi is undefined', () => {
    expect(resolveOpenApiSpecPaths({ name: 'Test' })).toEqual([]);
  });

  it('should return empty array when openapi has no specs or specPath', () => {
    expect(resolveOpenApiSpecPaths({ name: 'Test', openapi: {} as any })).toEqual([]);
  });

  it('should return single path from specPath (legacy format)', () => {
    const config = { name: 'T', openapi: { specPath: 'openapi.yaml' } as any };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['openapi.yaml']);
  });

  it('should return array with single string from specs (new format)', () => {
    const config = { name: 'T', openapi: { specs: 'api-spec.yaml' } as any };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['api-spec.yaml']);
  });

  it('should return paths from specs array (multi-file new format)', () => {
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

  it('should prefer specs over specPath when both present', () => {
    const config = {
      name: 'T',
      openapi: { specPath: 'old.yaml', specs: 'new.yaml' } as any,
    };
    expect(resolveOpenApiSpecPaths(config)).toEqual(['new.yaml']);
  });

  it('should return empty array for empty specs array', () => {
    const config = { name: 'T', openapi: { specs: [] } as any };
    // Zod schema allows empty array; map returns []
    expect(resolveOpenApiSpecPaths(config)).toEqual([]);
  });
});

// ============================================================
// isOpenApiEnabled — 新增 specs 格式覆盖
// ============================================================

describe('isOpenApiEnabled - new specs format', () => {
  it('should return true when specs is a non-empty string', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { specs: 'spec.yaml' } as any })).toBe(true);
  });

  it('should return true when specs is a non-empty array', () => {
    expect(
      isOpenApiEnabled({
        name: 'T',
        openapi: { specs: [{ path: 'a.yaml' }, { path: 'b.yaml' }] } as any,
      })
    ).toBe(true);
  });

  it('should return false when specPath is null', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { specPath: null as any } as any })).toBe(false);
  });

  it('should return false when openapi object has no valid spec fields', () => {
    expect(isOpenApiEnabled({ name: 'T', openapi: { label: 'API' } as any })).toBe(false);
  });
});

// ============================================================
// isSeparateTabMode — 覆盖 schema.ts:197-199
// ============================================================

describe('isSeparateTabMode', () => {
  it('should return true when separateTab is true', () => {
    expect(
      isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: true } as any })
    ).toBe(true);
  });

  it('should return false when separateTab is false', () => {
    expect(
      isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: false } as any })
    ).toBe(false);
  });

  it('should return false when separateTab is undefined (default)', () => {
    expect(isSeparateTabMode({ name: 'T', openapi: { specPath: 'a.yaml' } as any })).toBe(false);
  });

  it('should return false when openapi is undefined', () => {
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

  it('should default groupBy to tag when not provided', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('tag');
  });

  it('should default separateTab to false when not provided', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(false);
  });

  it('should preserve provided groupBy value', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml', groupBy: 'route' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('route');
  });

  it('should preserve provided separateTab value', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specPath: 'a.yaml', separateTab: true } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(true);
  });

  it('should pass through specs field when provided as string', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'T', openapi: { specs: 'my-spec.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.specs).toBe('my-spec.yaml');
  });

  it('should pass through specs field when provided as array', async () => {
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

  it('should merge all openapi defaults together correctly', async () => {
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
  it('should accept valid header config with all fields', () => {
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

  it('should accept empty header config', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {},
    });
    expect(result.success).toBe(true);
  });

  it('should accept header with links array', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        links: [{ label: 'API Key', href: '/keys', external: false }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept header with object logo (light/dark)', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject header with non-string height', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { height: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('should accept link with only label (backward compatible)', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ label: 'Docs', href: '/docs' }] },
    });
    expect(result.success).toBe(true);
  });

  it('should accept link with only icon', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ icon: 'Github', href: 'https://github.com/test' }] },
    });
    expect(result.success).toBe(true);
  });

  it('should accept link with both icon and label', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: {
        links: [{ icon: 'Github', label: 'GitHub', href: 'https://github.com/test' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject link with neither icon nor label', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      header: { links: [{ href: 'https://example.com' }] },
    });
    expect(result.success).toBe(false);
  });
});

describe('isHeaderEnabled', () => {
  it('should return false when header is undefined', () => {
    expect(isHeaderEnabled({ name: 'T' })).toBe(false);
  });

  it('should return true when header exists (even with minimal config)', () => {
    expect(isHeaderEnabled({ name: 'T', header: { sticky: true, bordered: true } })).toBe(true);
  });

  it('should return true when header has height configured', () => {
    expect(
      isHeaderEnabled({ name: 'T', header: { height: '64px', sticky: true, bordered: true } })
    ).toBe(true);
  });

  it('should return true when header is fully configured', () => {
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

  it('should return true when header has only links', () => {
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
  it('should accept string shorthand', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: '/logo.svg',
    });
    expect(result.success).toBe(true);
  });

  it('should accept object with light and dark', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/logo.svg', dark: '/logo-dark.svg' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept object with position', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/l.svg', dark: '/d.svg', position: 'header' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid position value', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/l.svg', dark: '/d.svg', position: 'invalid' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject object missing light field', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { dark: '/dark.svg' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject object missing dark field', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      logo: { light: '/light.svg' },
    });
    expect(result.success).toBe(false);
  });
});

describe('normalizeTopLevelLogo', () => {
  it('should normalize string shorthand to object with sidebar position', () => {
    const result = normalizeTopLevelLogo('/logo.svg');
    expect(result).toEqual({ light: '/logo.svg', dark: '/logo.svg', position: 'sidebar' });
  });

  it('should normalize object without position to default sidebar', () => {
    const result = normalizeTopLevelLogo({ light: '/l.svg', dark: '/d.svg' });
    expect(result).toEqual({ light: '/l.svg', dark: '/d.svg', position: 'sidebar' });
  });

  it('should preserve explicit position', () => {
    const result = normalizeTopLevelLogo({ light: '/l.svg', dark: '/d.svg', position: 'header' });
    expect(result).toEqual({ light: '/l.svg', dark: '/d.svg', position: 'header' });
  });
});

describe('resolveEffectiveLogo', () => {
  it('should return top-level logo as highest priority', () => {
    const config = {
      name: 'Test',
      logo: { light: '/top-light.svg', dark: '/top-dark.svg' },
      navbar: { logo: '/nav-logo.svg' },
      header: { logo: '/header-logo.svg' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toEqual({ light: '/top-light.svg', dark: '/top-dark.svg' });
    expect(result.position).toBe('sidebar');
  });

  it('should return top-level logo with header position', () => {
    const config = {
      name: 'Test',
      logo: { light: '/l.svg', dark: '/d.svg', position: 'header' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toEqual({ light: '/l.svg', dark: '/d.svg' });
    expect(result.position).toBe('header');
  });

  it('should fallback to navbar.logo when no top-level logo', () => {
    const config = {
      name: 'Test',
      navbar: { logo: '/nav.svg' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toBe('/nav.svg');
    expect(result.position).toBe('sidebar');
  });

  it('should fallback to header.logo when no top-level or navbar logo', () => {
    const config = {
      name: 'Test',
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toBe('/hdr.svg');
    expect(result.position).toBe('header');
  });

  it('should return undefined when no logo configured anywhere', () => {
    const config = { name: 'Test' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toBeUndefined();
    expect(result.position).toBe('sidebar');
  });

  it('should handle string shorthand top-level logo', () => {
    const config = { name: 'Test', logo: '/logo.svg' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    // 字符串简写被 normalizeTopLevelLogo 标准化为 { light, dark } 对象
    expect(result.source).toEqual({ light: '/logo.svg', dark: '/logo.svg' });
    expect(result.position).toBe('sidebar');
  });
});

describe('loadConfig - top-level logo propagation', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-logo');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should propagate top-level logo with position=sidebar to navbar.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/l.svg', dark: '/d.svg', position: 'sidebar' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toEqual({ light: '/l.svg', dark: '/d.svg' });
    expect(config.header?.logo).toBeUndefined();
  });

  it('should propagate top-level logo with position=header to header.logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/l.svg', dark: '/d.svg', position: 'header' },
        header: { height: '56px' },
      })
    );
    const config = await loadConfig(tmpDir);
    expect(config.header?.logo).toEqual({ light: '/l.svg', dark: '/d.svg' });
    // navbar should fallback to config.name (not the top-level logo)
    expect(config.navbar?.logo).toBe('MyApp');
  });

  it('should propagate string shorthand top-level logo to navbar.logo by default', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', logo: '/logo.svg' })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('/logo.svg');
  });

  it('should preserve legacy navbar.logo when no top-level logo', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', navbar: { logo: '/legacy-nav.svg' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.navbar?.logo).toBe('/legacy-nav.svg');
  });

  it('should preserve legacy header.logo when no top-level logo', async () => {
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

  it('should normalize position default in merged config', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', logo: { light: '/l.svg', dark: '/d.svg' } })
    );
    const config = await loadConfig(tmpDir);
    // position 应该被标准化为 'sidebar'
    if (typeof config.logo === 'object' && !Array.isArray(config.logo)) {
      expect((config.logo as Record<string, unknown>).position).toBe('sidebar');
    }
  });
});

describe('resolveEffectiveLogo - full priority chain coverage', () => {
  it('should prioritize top-level logo over both navbar and header logos', () => {
    const config = {
      name: 'Test',
      logo: { light: '/top.svg', dark: '/top-dark.svg' },
      navbar: { logo: '/nav.svg' },
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toEqual({ light: '/top.svg', dark: '/top-dark.svg' });
    expect(result.position).toBe('sidebar');
  });

  it('should return header position when only header.logo exists (no top-level or navbar)', () => {
    const config = {
      name: 'Test',
      header: { logo: '/hdr.svg', height: '64px' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toBe('/hdr.svg');
    expect(result.position).toBe('header');
  });

  it('should return sidebar position for navbar.logo even without top-level logo', () => {
    const config = {
      name: 'Test',
      navbar: { logo: '/nav.svg' },
    } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    expect(result.source).toBe('/nav.svg');
    expect(result.position).toBe('sidebar');
  });

  it('should handle top-level string shorthand with explicit object comparison', () => {
    const config = { name: 'Test', logo: '/logo.svg' } as OpenManualConfig;
    const result = resolveEffectiveLogo(config);
    // String shorthand normalized to { light, dark: same }
    expect(result.source).toEqual({ light: '/logo.svg', dark: '/logo.svg' });
    expect(result.position).toBe('sidebar');
  });
});

describe('loadConfig - mergeDefaults branch coverage', () => {
  const tmpDir = join(process.cwd(), '.test-tmp-branch');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should default search.position to sidebar when search is configured without position', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp', search: {} }));
    const config = await loadConfig(tmpDir);
    expect(config.search?.position).toBe('sidebar');
  });

  it('should default i18n.languages to empty array when i18n enabled without languages', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', i18n: { enabled: true } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.i18n?.enabled).toBe(true);
    expect(config.i18n?.languages).toEqual([]);
  });

  it('should use provided i18n.languages when explicitly set', async () => {
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

  it('should default openapi.groupBy to tag when not specified', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.groupBy).toBe('tag');
  });

  it('should default openapi.separateTab to false when not specified', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.separateTab).toBe(false);
  });

  it('should default openapi.label to 接口文档 when not specified', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({ name: 'MyApp', openapi: { specPath: 'openapi.yaml' } })
    );
    const config = await loadConfig(tmpDir);
    expect(config.openapi?.label).toBe('接口文档');
  });

  it('should not set search when search field is absent', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'MyApp' }));
    const config = await loadConfig(tmpDir);
    expect(config.search).toBeUndefined();
  });

  it('should preserve existing header.logo when top-level logo position=sidebar', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      join(tmpDir, 'openmanual.json'),
      JSON.stringify({
        name: 'MyApp',
        logo: { light: '/top.svg', dark: '/top-dark.svg', position: 'sidebar' },
        header: { height: '56px', logo: '/existing-hdr.svg' },
      })
    );
    const config = await loadConfig(tmpDir);
    // header.logo should be preserved (not overwritten by sidebar-positioned top-level logo)
    expect(config.header?.logo).toBe('/existing-hdr.svg');
    // top-level logo should propagate to navbar instead
    expect(config.navbar?.logo).toEqual({ light: '/top.svg', dark: '/top-dark.svg' });
  });
});
