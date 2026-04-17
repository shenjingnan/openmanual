import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { OpenManualConfig } from '../core/config/schema.js';
import { generateAll } from '../core/generator/index.js';

const TMP_DIR = join(process.env.TMPDIR ?? '/tmp', 'om-test-meta-fs');

function baseConfig(overrides?: Partial<OpenManualConfig>): OpenManualConfig {
  return { name: 'TestProject', ...overrides };
}

describe('generateAll - meta auto-generation (real FS)', () => {
  let projectDir: string;
  let appDir: string;

  beforeEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(TMP_DIR, { recursive: true });
    projectDir = TMP_DIR;
    appDir = join(TMP_DIR, '.cache', 'app');
  });

  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  async function setupContent(files: Record<string, string>): Promise<void> {
    for (const [relPath, content] of Object.entries(files)) {
      const absPath = join(projectDir, 'content', relPath);
      await mkdir(join(absPath, '..'), { recursive: true });
      await writeFile(absPath, content);
    }
  }

  async function readMeta(relPath: string): Promise<unknown> {
    const raw = await readFile(join(projectDir, 'content', relPath), 'utf-8');
    return JSON.parse(raw);
  }

  // ============================================================
  // 用例 1.1: 单语言模式自动生成根级 + 目录级 meta.json
  // 注意: scanContentDir 按 localeCompare 排序，pages 为字母序
  // ============================================================

  it('should auto-generate root and directory meta.json in single-language mode', async () => {
    await setupContent({
      'index.md': '---\ntitle: Home\n---\n# Home',
      'getting-started.md': '---\ntitle: Getting Started\n---\n# Getting Started',
      'guide/configuration.md': '---\ntitle: Configuration\n---\n# Config',
      'guide/deployment.md': '---\ntitle: Deployment\n---\n# Deploy',
      'api/reference.md': '---\ntitle: API Reference\n---\n# API',
    });

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 验证根级 meta.json（pages 按 localeCompare 字母序）
    const rootMeta = (await readMeta('meta.json')) as Record<string, unknown>;
    expect(rootMeta.title).toBe('Getting Started');
    expect(rootMeta.pages).toEqual(['getting-started', 'index']);

    // 验证 guide/meta.json
    const guideMeta = (await readMeta('guide/meta.json')) as Record<string, unknown>;
    expect(guideMeta.title).toBe('Guide');
    expect(guideMeta.pages).toEqual(['configuration', 'deployment']);

    // 验证 api/meta.json
    const apiMeta = (await readMeta('api/meta.json')) as Record<string, unknown>;
    expect(apiMeta.title).toBe('Api');
    expect(apiMeta.pages).toEqual(['reference']);
  });

  // ============================================================
  // 用例 1.2: dir-parser i18n 模式为每种语言生成 meta.json
  // 注意：内容文件放在 content/ 下（非 content/{lang}/），
  // 这样 autoGenerateMetaFromFS 的 dirGroup 名称不会与语言代码冲突，
  // 路径 join(contentAbsDir, lang, dirName, 'meta.json') 能正确工作
  // ============================================================

  it('should generate per-language meta.json in dir-parser i18n mode', async () => {
    // 内容文件放在 content/ 根目录和子目录（不放在 {lang} 子目录中）
    await setupContent({
      'index.md': '---\ntitle: Home\n---\n# Home',
      'getting-started.md': '---\ntitle: Quick Start\n---\n# Start',
      'guide/configuration.md': '---\ntitle: Configuration\n---\n# Config',
    });

    await generateAll({
      config: baseConfig({
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      }),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // dir-parser 模式：为每种语言都生成一份 meta.json
    // 根级：content/zh/meta.json 和 content/en/meta.json
    const zhRootMeta = (await readMeta('zh/meta.json')) as Record<string, unknown>;
    expect(zhRootMeta.title).toBe('Getting Started');
    expect(zhRootMeta.pages).toEqual(['getting-started', 'index']);

    const enRootMeta = (await readMeta('en/meta.json')) as Record<string, unknown>;
    expect(enRootMeta.title).toBe('Getting Started');
    expect(enRootMeta.pages).toEqual(['getting-started', 'index']);

    // 目录级：content/zh/guide/meta.json 和 content/en/guide/meta.json
    const zhGuideMeta = (await readMeta('zh/guide/meta.json')) as Record<string, unknown>;
    expect(zhGuideMeta.title).toBe('Guide');
    expect(zhGuideMeta.pages).toEqual(['configuration']);

    const enGuideMeta = (await readMeta('en/guide/meta.json')) as Record<string, unknown>;
    expect(enGuideMeta.title).toBe('Guide');
    expect(enGuideMeta.pages).toEqual(['configuration']);
  });

  // ============================================================
  // 用例 1.3: 已有 meta.json 时走 enrich 路径不覆盖用户内容
  // ============================================================

  it('should enrich existing meta.json without overwriting user content', async () => {
    // 预先创建有 title 但缺少 icon/defaultOpen/pages 的 meta.json
    await mkdir(join(projectDir, 'content', 'guide'), { recursive: true });
    await writeFile(join(projectDir, 'content', 'meta.json'), JSON.stringify({ title: '开始' }));
    await writeFile(
      join(projectDir, 'content', 'guide', 'meta.json'),
      JSON.stringify({ title: '指南' })
    );
    // 也需要有实际内容文件，否则 scanContentDir 返回空
    await writeFile(join(projectDir, 'content', 'index.md'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(projectDir, 'content', 'guide', 'intro.md'),
      '---\ntitle: Intro\n---\n# Intro'
    );

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 原始 meta.json 不应被覆盖（只有 title，没有 icon/defaultOpen/pages）
    const rootMeta = (await readMeta('meta.json')) as Record<string, unknown>;
    expect(rootMeta.title).toBe('开始');
    // 不应自动添加 pages 字段（因为 enrich 只在 group 有值但文件没有时添加，
    // 而 group 的值来自同一文件）

    const guideMeta = (await readMeta('guide/meta.json')) as Record<string, unknown>;
    expect(guideMeta.title).toBe('指南');
  });

  // ============================================================
  // 用例 1.4: computeAllSlugs 从已有 meta.json 收集 slugs
  // ============================================================

  it('should compute slugs from existing meta.json files', async () => {
    await mkdir(join(projectDir, 'content', 'guide'), { recursive: true });
    await writeFile(
      join(projectDir, 'content', 'meta.json'),
      JSON.stringify({ title: '开始', pages: ['index', 'quickstart'] })
    );
    await writeFile(
      join(projectDir, 'content', 'guide', 'meta.json'),
      JSON.stringify({ title: '指南', pages: ['configuration', 'writing-docs'] })
    );
    // 需要实际文件存在以避免 scanContentDir 报错
    await writeFile(join(projectDir, 'content', 'index.md'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(projectDir, 'content', 'guide', 'configuration.md'),
      '---\ntitle: Config\n---\n# Config'
    );

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 通过检查生成的 page.tsx 来间接验证 allSlugs 被正确计算
    // page.tsx 中 allowedSlugs 使用 JSON.stringify 生成，包含双引号
    const pageContent = await readFile(join(appDir, 'app/[[...slug]]/page.tsx'), 'utf-8');
    expect(pageContent).toContain('"index"');
    expect(pageContent).toContain('"quickstart"');
    expect(pageContent).toContain('"guide/configuration"');
    expect(pageContent).toContain('"guide/writing-docs"');
  });

  // ============================================================
  // 用例 1.5: meta.json 已存在时 writeMetaIfNotExists 跳过写入
  // ============================================================

  it('should not overwrite existing meta.json when auto-generating', async () => {
    // 预先创建自定义 meta.json
    await mkdir(join(projectDir, 'content', 'guide'), { recursive: true });
    await writeFile(join(projectDir, 'content', 'index.md'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(projectDir, 'content', 'guide', 'config.md'),
      '---\ntitle: Config\n---\n# Config'
    );
    // 预先创建 guide/meta.json（带自定义内容）
    await writeFile(
      join(projectDir, 'content', 'guide', 'meta.json'),
      JSON.stringify({ title: 'Custom Guide Title', icon: 'BookOpen', pages: ['config'] })
    );

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 自定义内容应保留
    const guideMeta = (await readMeta('guide/meta.json')) as Record<string, unknown>;
    expect(guideMeta.title).toBe('Custom Guide Title');
    expect(guideMeta.icon).toBe('BookOpen');
    expect(guideMeta.pages).toEqual(['config']);
  });

  // ============================================================
  // 用例 1.6: 无内容文件时不生成任何 meta.json
  // ============================================================

  it('should not generate any meta.json when content dir has no files', async () => {
    // 创建空的 content 目录
    await mkdir(join(projectDir, 'content'), { recursive: true });

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 确认没有 meta.json 被生成
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(join(projectDir, 'content'));
    expect(files).not.toContain('meta.json');
  });

  // ============================================================
  // 用例 1.7: enrichMetaFile catch 块 — 损坏的 meta.json 静默跳过
  // ============================================================

  it('should silently skip unreadable meta.json in enrichment', async () => {
    await mkdir(join(projectDir, 'content', 'guide'), { recursive: true });
    // 写入非法 JSON 作为 meta.json
    await writeFile(join(projectDir, 'content', 'guide', 'meta.json'), 'not-valid-json{{{');
    // 需要有实际内容文件
    await writeFile(join(projectDir, 'content', 'index.md'), '---\ntitle: Home\n---\n# Home');

    // 不应抛出异常
    await expect(
      generateAll({
        config: baseConfig(),
        projectDir,
        appDir,
        contentDir: 'content',
      })
    ).resolves.toBeUndefined();
  });

  // ============================================================
  // 补充: 只有目录级文件（无根级文件）的 meta 生成
  // pages 按 localeCompare 字母序
  // ============================================================

  it('should only generate directory-level meta.json when no root files exist', async () => {
    await setupContent({
      'guide/intro.md': '---\ntitle: Intro\n---\n# Intro',
      'guide/advanced.md': '---\ntitle: Advanced\n---\n# Advanced',
      'components/card.md': '---\ntitle: Card\n---\n# Card',
    });

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 不应有根级 meta.json（rootFiles.length === 0）
    await expect(readFile(join(projectDir, 'content', 'meta.json'), 'utf-8')).rejects.toThrow();

    // 应有 guide/meta.json 和 components/meta.json（pages 按字母序）
    const guideMeta = (await readMeta('guide/meta.json')) as Record<string, unknown>;
    expect(guideMeta.title).toBe('Guide');
    expect(guideMeta.pages).toEqual(['advanced', 'intro']);

    const componentsMeta = (await readMeta('components/meta.json')) as Record<string, unknown>;
    expect(componentsMeta.title).toBe('Components');
    expect(componentsMeta.pages).toEqual(['card']);
  });

  // ============================================================
  // 补充: 单文件在根级别 — 生成只有一个页面的 meta.json
  // ============================================================

  it('should generate meta.json with single root file', async () => {
    await setupContent({
      'index.md': '---\ntitle: Home\n---\n# Home',
    });

    await generateAll({
      config: baseConfig(),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    const rootMeta = (await readMeta('meta.json')) as Record<string, unknown>;
    expect(rootMeta.title).toBe('Getting Started');
    expect(rootMeta.pages).toEqual(['index']);
  });

  // ============================================================
  // 补充: dot-parser i18n 模式（非 dir）的 meta 生成
  // pages 按 localeCompare 字母序
  // ============================================================

  it('should auto-generate meta.json in dot-parser i18n mode', async () => {
    await mkdir(join(projectDir, 'content', 'guide'), { recursive: true });
    await writeFile(join(projectDir, 'content', 'index.mdx'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(projectDir, 'content', 'getting-started.mdx'),
      '---\ntitle: Quick Start\n---\n# Start'
    );
    await writeFile(
      join(projectDir, 'content', 'guide', 'config.mdx'),
      '---\ntitle: Config\n---\n# Config'
    );

    await generateAll({
      config: baseConfig({
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dot',
        },
      }),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // dot-parser 模式下应生成 content/meta.json（不是 per-language）
    const rootMeta = (await readMeta('meta.json')) as Record<string, unknown>;
    expect(rootMeta.title).toBe('Getting Started');
    expect(rootMeta.pages).toEqual(['getting-started', 'index']);

    const guideMeta = (await readMeta('guide/meta.json')) as Record<string, unknown>;
    expect(guideMeta.title).toBe('Guide');
    expect(guideMeta.pages).toEqual(['config']);
  });

  // ============================================================
  // 用例：rootGroups Tab URL 使用文件路径导航 + urls Set 匹配全组页面
  // ============================================================

  it('should use file-path URL for navigation and urls Set for group-wide matching', async () => {
    // 模拟当前项目的实际结构：meta.json 只有 title 和 root，没有 pages
    // 注意：i18n 模式需要至少 2 个语言才能启用
    await setupContent({
      'zh/guide/meta.json': JSON.stringify({ title: '指南', root: true }),
      'zh/guide/configuration.mdx': '---\ntitle: Configuration\n---\n# Config',
      'zh/guide/deployment.mdx': '---\ntitle: Deployment\n---\n# Deploy',
      'zh/advanced/meta.json': JSON.stringify({ title: '进阶', root: true }),
      'zh/advanced/mdx.mdx': '---\ntitle: MDX\n---\n# MDX',
      'zh/index.mdx': '---\ntitle: 首页\n---\n# Home',
    });

    await generateAll({
      config: baseConfig({
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      }),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 验证生成的 layout.tsx 中 sidebar.tabs 配置
    const layoutContent = await readFile(
      join(appDir, 'app/[lang]/[[...slug]]/layout.tsx'),
      'utf-8'
    );

    // "指南" tab URL 应为文件路径（用于导航到实际页面）
    expect(layoutContent).toContain('"url":"/zh/guide/configuration"');

    // urls Set 应包含该分组下所有页面（用于 isLayoutTabActive 匹配）
    expect(layoutContent).toContain('"/zh/guide/configuration"');
    expect(layoutContent).toContain('"/zh/guide/deployment"');

    // "进阶" tab URL 应为文件路径
    expect(layoutContent).toContain('"url":"/zh/advanced/mdx"');
    expect(layoutContent).toContain('"/zh/advanced/mdx"');

    // 应包含 urls Set 构造
    expect(layoutContent).toContain('new Set<string>');
  });

  // ============================================================
  // 用例：rootGroups Tab URL 使用 pages[0] 作为导航目标
  // ============================================================

  it('should use pages[0] as tab URL when explicitly configured in meta.json', async () => {
    await setupContent({
      'zh/guide/meta.json': JSON.stringify({
        title: '指南',
        root: true,
        pages: ['deployment'],
      }),
      'zh/guide/configuration.mdx': '---\ntitle: Configuration\n---\n# Config',
      'zh/guide/deployment.mdx': '---\ntitle: Deployment\n---\n# Deploy',
      'zh/index.mdx': '---\ntitle: 首页\n---\n# Home',
    });

    await generateAll({
      config: baseConfig({
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      }),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    const layoutContent = await readFile(
      join(appDir, 'app/[lang]/[[...slug]]/layout.tsx'),
      'utf-8'
    );

    // URL 应使用 meta.json 中配置的 pages[0]
    expect(layoutContent).toContain('"url":"/zh/guide/deployment"');

    // urls Set 仍应包含该分组所有扫描到的页面
    expect(layoutContent).toContain('"/zh/guide/configuration"');
    expect(layoutContent).toContain('"/zh/guide/deployment"');
  });

  // ============================================================
  // 用例：rootGroups 空目录回退到 index
  // ============================================================

  it('should fallback to index as tab URL when directory has no scanned files', async () => {
    // meta.json 有 root:true 且无 pages，目录下无任何 mdx 文件
    await setupContent({
      'zh/guide/meta.json': JSON.stringify({ title: '指南', root: true }),
      'zh/index.mdx': '---\ntitle: 首页\n---\n# Home',
    });

    await generateAll({
      config: baseConfig({
        i18n: {
          enabled: true,
          defaultLanguage: 'zh',
          languages: [
            { code: 'zh', name: '中文' },
            { code: 'en', name: 'English' },
          ],
          parser: 'dir',
        },
      }),
      projectDir,
      appDir,
      contentDir: 'content',
    });

    const layoutContent = await readFile(
      join(appDir, 'app/[lang]/[[...slug]]/layout.tsx'),
      'utf-8'
    );

    // 空目录时 URL 回退到 index
    expect(layoutContent).toContain('"url":"/zh/guide/index"');
  });

  // ============================================================
  // 用例：非 i18n 模式下 rootGroups 生成 sidebar.tabs（覆盖 index.ts:332）
  // ============================================================

  it('should generate non-i18n sidebar.tabs from rootGroups in single-language mode', async () => {
    // 单语言模式（无 i18n 配置），使用 dot-parser 扫描 meta.json
    await setupContent({
      'guide/meta.json': JSON.stringify({ title: '指南', root: true }),
      'guide/configuration.mdx': '---\ntitle: Configuration\n---\n# Config',
      'guide/deployment.mdx': '---\ntitle: Deployment\n---\n# Deploy',
      'index.mdx': '---\ntitle: 首页\n---\n# Home',
    });

    await generateAll({
      config: baseConfig(), // 单语言模式，无 i18n 配置
      projectDir,
      appDir,
      contentDir: 'content',
    });

    // 非 i18n 模式：layout 输出到 app/[[...slug]]/layout.tsx
    const layoutContent = await readFile(join(appDir, 'app/[[...slug]]/layout.tsx'), 'utf-8');

    // 非i18n模式：tabs 为模板字面量生成的数组（不含 ${lang} 模板字面量）
    expect(layoutContent).toContain("url: '/'");
    expect(layoutContent).toContain("'指南'");
    // URL 使用文件路径导航（取自扫描到的第一个文件）
    expect(layoutContent).toContain("url: '/guide/configuration'");
    // 非 i18n 分支使用 new Set(...) 保持正确的 Set 类型
    expect(layoutContent).toContain('new Set(');
    // 不应包含 i18n 特有的模板语法
    expect(layoutContent).not.toContain('`${lang}`');
    // 应包含 sidebar.tabs 结构（非 i18n 分支的关键特征）
    expect(layoutContent).toContain('sidebar:');
    expect(layoutContent).toContain('tabs:');
  });
});
