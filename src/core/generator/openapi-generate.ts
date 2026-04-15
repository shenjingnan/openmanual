import { access, mkdir, readdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { GenerateContext } from './index.js';
import { generateOpenAPIInstance } from './openapi-instance.js';
import { generateAPIPageComponent } from './openapi-page-component.js';
import { generateOAPIClientComponent } from './openapi-client.js';
import { isI18nEnabled } from '../config/schema.js';

/**
 * 预注入 OpenAPI sidebar 配置（在生成 page.tsx 之前调用）
 *
 * 解析 OpenAPI spec 文件，提取 operation 信息，预计算 sidebar 条目并注入到
 * ctx.config.sidebar 中。这样 page.tsx 的 allowedSlugs 就能包含 API 页面的 slug。
 */
export async function preInjectOpenAPISidebar(ctx: GenerateContext): Promise<void> {
  const oapiCfg = ctx.config.openapi;
  if (!oapiCfg) return;
  const specPath = resolve(ctx.projectDir, oapiCfg.spec);

  // 解析 OpenAPI spec 获取操作列表
  const operations = await parseOpenAPIOperations(specPath);
  if (operations.length === 0) return;

  const sidebarTitle = resolveSidebarTitle(ctx);
  const outputDir = oapiCfg.outputDir ?? 'api';

  // 构建 sidebar pages
  const pages = operations.map((op) => ({
    slug: `${outputDir}/${op.operationId}`,
    title: op.summary ?? op.operationId,
  }));

  const sidebarGroup = {
    group: sidebarTitle,
    icon: oapiCfg.icon ?? 'Code2',
    collapsed: oapiCfg.collapsed !== false,
    pages,
  };

  // 注入到 config.sidebar（不覆盖已有配置）
  if (!ctx.config.sidebar) {
    ctx.config.sidebar = [];
  }

  const exists = ctx.config.sidebar.some(
    (g) => g.group === sidebarTitle || g.pages.some((p) => p.slug.startsWith(outputDir)),
  );

  if (!exists) {
    ctx.config.sidebar.push(sidebarGroup);
  }
}

/**
 * 轻量级解析 OpenAPI spec，提取操作列表
 * 不依赖 fumadocs-openapi，仅读取 paths/methods 信息
 */
async function parseOpenAPIOperations(
  specPath: string,
): Promise<Array<{ operationId: string; summary: string; tags?: string[] }>> {
  const content = await readFile(specPath, 'utf-8');
  let spec: Record<string, unknown>;

  if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
    let yaml: (content: string) => Record<string, unknown>;
    try {
      const mod = await import('yaml');
      yaml = mod.parse;
    } catch {
      try {
        const mod = await import('js-yaml');
        yaml = mod.load;
      } catch {
        console.warn('[openmanual] No YAML parser available, skipping OpenAPI pre-injection');
        return [];
      }
    }
    spec = yaml(content) as Record<string, unknown>;
  } else {
    spec = JSON.parse(content) as Record<string, unknown>;
  }

  const paths = spec.paths as Record<string, unknown> | undefined;
  if (!paths) return [];

  const operations: Array<{ operationId: string; summary: string; tags?: string[] }> = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;

    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const op = (pathItem as Record<string, unknown>)[method] as
        | Record<string, unknown>
        | undefined;
      if (!op || typeof op !== 'object') continue;

      const operationId =
        (op.operationId as string) ??
        `${method}-${path.replace(/\//g, '-').replace(/[{}]/g, '')}`;
      const summary = (op.summary as string) ?? operationId;
      const tags = op.tags as string[] | undefined;

      operations.push({ operationId, summary, tags });
    }
  }

  return operations;
}

/**
 * 核心：OpenAPI 文件生成流程
 *
 * 1. 生成 lib/openapi.ts、components/api-page.tsx、components/api-page.client.tsx
 * 2. 调用 generateFiles() 生成 MDX 到 content/{defaultLang}/api/
 * 3. 为其他语言创建 api/ symlink
 * 4. 自动注入 sidebar 配置
 */
export async function generateOpenAPIFiles(ctx: GenerateContext): Promise<void> {
  const oapiCfg = ctx.config.openapi;
  if (!oapiCfg) return;
  const isI18n = isI18nEnabled(ctx.config);
  const languages = isI18n
    ? (ctx.config.i18n?.languages ?? []).map((l) => l.code)
    : [];
  const defaultLang = ctx.config.i18n?.defaultLanguage ?? 'zh';

  // 1. 生成组件文件到 .cache/app/
  await writeFile(
    join(ctx.appDir, 'lib/openapi.ts'),
    generateOpenAPIInstance(ctx),
    'utf-8',
  );
  await writeFile(
    join(ctx.appDir, 'components/api-page.tsx'),
    generateAPIPageComponent(),
    'utf-8',
  );
  await writeFile(
    join(ctx.appDir, 'components/api-page.client.tsx'),
    generateOAPIClientComponent(),
    'utf-8',
  );

  // 2. 确定输出目录并调用 generateFiles()
  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);

  if (isI18n) {
    // i18n 模式: 只在默认语言目录下生成
    const outputDir = join(contentAbsDir, defaultLang, oapiCfg.outputDir);
    await mkdir(outputDir, { recursive: true });
    await callGenerateFiles(ctx, outputDir);

    // 3. 为其他语言创建 symlink
    for (const lang of languages) {
      if (lang === defaultLang) continue;
      const targetDir = join(contentAbsDir, lang, oapiCfg.outputDir);
      try {
        await access(targetDir);
        // 已存在则先删除（可能是旧的 symlink 或目录）
        await unlink(targetDir);
      } catch {
        // 不存在，直接创建
      }
      await mkdir(join(targetDir, '..'), { recursive: true });
      await symlink(outputDir, targetDir);
    }
  } else {
    // 单语言模式
    const outputDir = join(contentAbsDir, oapiCfg.outputDir);
    await mkdir(outputDir, { recursive: true });
    await callGenerateFiles(ctx, outputDir);
  }
  // 注意：sidebar 已由 preInjectOpenAPISidebar() 在流程开头预注入
}

/**
 * 调用 fumadocs-openapi 的 generateFiles()
 *
 * generateFiles() 需要接收 createOpenAPI() 返回的实例对象，而非文件路径字符串。
 */
async function callGenerateFiles(
  ctx: GenerateContext,
  outputDir: string,
): Promise<void> {
  const oapiCfg = ctx.config.openapi;
  if (!oapiCfg) return;
  const specPath = resolve(ctx.projectDir, oapiCfg.spec);

  try {
    const { createOpenAPI } = await import('fumadocs-openapi/server');
    const { generateFiles } = await import('fumadocs-openapi');

    // 创建 OpenAPI 实例（与生成的 lib/openapi.ts 保持一致）
    const openapi = createOpenAPI({
      input: [specPath],
    });

    await generateFiles({
      input: openapi,
      output: outputDir,
      per: oapiCfg.per as 'operation' | 'tag' | 'file',
      includeDescription: true,
    });
  } catch (e) {
    console.error('[openmanual] Failed to generate OpenAPI files:', e);
    throw e;
  }
}

/**
 * 扫描生成的 MDX 文件，自动注入 sidebar 配置
 *
 * 策略：
 * - 扫描 content/{defaultLang}/{outputDir}/ 下所有 .mdx 文件
 * - 根据 groupBy 决定 sidebar 结构
 * - 追加到 config.sidebar 数组（不覆盖用户已有配置）
 */
async function _injectOpenAPISidebar(ctx: GenerateContext): Promise<void> {
  const oapiCfg = ctx.config.openapi;
  if (!oapiCfg) return;
  const isI18n = isI18nEnabled(ctx.config);
  const defaultLang = ctx.config.i18n?.defaultLanguage ?? 'zh';
  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);
  const scanDir = isI18n
    ? join(contentAbsDir, defaultLang, oapiCfg.outputDir)
    : join(contentAbsDir, oapiCfg.outputDir);

  // 扫描所有生成的 .mdx 文件
  const mdxFiles = await collectMdxFiles(scanDir);
  if (mdxFiles.length === 0) return;

  // 从 frontmatter 提取页面信息
  const pages = await Promise.all(
    mdxFiles.map(async (filePath) => {
      const content = await readFile(filePath, 'utf-8');
      const title = extractFrontmatterField(content, 'title') ??
        filePath.replace(/\.mdx$/, '').split('/').pop() ??
        'Untitled';
      const slug = relative(scanDir, filePath).replace(/\.mdx$/, '');
      return { slug, title };
    }),
  );

  // 构建 sidebar group
  const sidebarTitle = resolveSidebarTitle(ctx);
  const sidebarGroup = {
    group: sidebarTitle,
    icon: oapiCfg.icon ?? 'Code2',
    collapsed: oapiCfg.collapsed !== false,
    pages: pages.map((p) => ({
      slug: `${oapiCfg.outputDir}/${p.slug}`,
      title: p.title,
    })),
  };

  // 追加到 config.sidebar（如果还没有 API 分组的话）
  if (!ctx.config.sidebar) {
    ctx.config.sidebar = [];
  }

  const existingApiGroup = ctx.config.sidebar.find((g) =>
    g.group === sidebarTitle || g.pages.some((p) => p.slug.startsWith(oapiCfg.outputDir)),
  );

  if (!existingApiGroup) {
    ctx.config.sidebar.push(sidebarGroup);
  }

  // 生成 meta.json 到输出目录
  const metaObj: Record<string, unknown> = {
    title: sidebarTitle,
  };
  if (oapiCfg.icon) metaObj.icon = oapiCfg.icon;
  if (oapiCfg.collapsed !== undefined) metaObj.defaultOpen = !oapiCfg.collapsed;

  const pageFiles = pages.map((p) => p.slug);
  if (pageFiles.length > 0) metaObj.pages = pageFiles;

  // 写入 meta.json
  const metaPath = join(scanDir, 'meta.json');
  try {
    await access(metaPath);
  } catch {
    await writeFile(metaPath, `${JSON.stringify(metaObj, null, 2)}\n`, 'utf-8');
  }
}

/**
 * 解析 sidebar 标题（支持多语言 fallback）
 */
function resolveSidebarTitle(ctx: GenerateContext): string {
  const oapiCfg = ctx.config.openapi;
  if (!oapiCfg) return;
  const locale = ctx.config.locale ?? 'zh';

  if (oapiCfg.title && typeof oapiCfg.title === 'object') {
    return oapiCfg.title[locale] ??
      oapiCfg.title.zh ??
      oapiCfg.title.en ??
      Object.values(oapiCfg.title)[0] ??
      'API Reference';
  }

  return 'API Reference';
}

/**
 * 递归收集目录下所有 .mdx 文件
 */
async function collectMdxFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await collectMdxFiles(fullPath)));
      } else if (entry.name.endsWith('.mdx')) {
        results.push(fullPath);
      }
    }
  } catch {
    // 目录不存在
  }

  return results;
}

/**
 * 从 MDX 内容中提取指定 frontmatter 字段
 */
function extractFrontmatterField(content: string, field: string): string | undefined {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim()?.replace(/^['"]|['"]$/g, '');
}
