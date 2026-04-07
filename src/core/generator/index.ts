import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { generateGlobalCss } from './global-css.js';
import { isImagePath, resolveLogoPaths } from './layout.js';
import { generateNextConfig } from './next-config.js';
import { generateOpenManualConfig } from './openmanual-config.js';
import { generatePackageJson } from './package-json.js';
import { generateSourceConfig } from './source-config.js';
import { readTemplate } from './template-reader.js';
import { generateTsconfig } from './tsconfig.js';

export interface GenerateContext {
  config: OpenManualConfig;
  /** Absolute path to user's project root */
  projectDir: string;
  /** Absolute path to .openmanual/app */
  appDir: string;
  /** Content directory relative to project root */
  contentDir: string;
  /** 开发模式标志，dev 模式下不设置 output: 'export'，生成 API 路由和 rewrites */
  dev?: boolean;
}

// 模板文件列表（从 templates/ 目录读取）
const TEMPLATE_FILES = [
  'app/layout.tsx',
  'app/provider.tsx',
  'app/[[...slug]]/layout.tsx',
  'app/[[...slug]]/page.tsx',
  'lib/source.ts',
  'lib/layout.tsx',
  'components/mermaid.tsx',
  'components/page-actions.tsx',
  'postcss.config.mjs',
];

export async function generateAll(ctx: GenerateContext): Promise<void> {
  // 1. 生成的文件（需要动态生成）
  const generatedFiles: Array<{ path: string; content: string }> = [
    { path: 'openmanual-config.ts', content: generateOpenManualConfig(ctx) },
    { path: 'source.config.ts', content: generateSourceConfig(ctx) },
    { path: 'next.config.mjs', content: generateNextConfig(ctx) },
    { path: 'global.css', content: generateGlobalCss(ctx) },
    { path: 'package.json', content: generatePackageJson(ctx) },
    { path: 'tsconfig.json', content: generateTsconfig() },
  ];

  // dev 模式额外生成 API 路由
  const templateFiles = ctx.dev
    ? [...TEMPLATE_FILES, 'app/api/raw/[...path]/route.ts']
    : TEMPLATE_FILES;

  // 写入生成的文件
  for (const file of generatedFiles) {
    const fullPath = join(ctx.appDir, file.path);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
  }

  // 写入模板文件（从 templates/ 目录读取）
  for (const tpl of templateFiles) {
    const content = readTemplate(tpl);
    const fullPath = join(ctx.appDir, tpl);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }

  // Generate logo SVG in public/ when logo is an image path
  const logo = ctx.config.navbar?.logo;
  if (logo && typeof logo === 'string' && isImagePath(logo)) {
    await ensureLogoFile(ctx, logo, 'light');
  } else if (logo && typeof logo === 'object') {
    const { light, dark } = resolveLogoPaths(logo);
    if (isImagePath(light)) {
      await ensureLogoFile(ctx, light, 'light');
    }
    if (isImagePath(dark) && dark !== light) {
      await ensureLogoFile(ctx, dark, 'dark');
    }
  }

  // Generate meta.json for each sidebar group directory
  await generateMetaFiles(ctx);
}

export function generateOpenManualLogoSvg(
  name: string,
  variant: 'light' | 'dark' = 'light'
): string {
  const textColor = variant === 'dark' ? '#E8E0D4' : '#000000';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 32" width="190" height="32">
  <text x="0" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="32" font-weight="700">
    <tspan fill="#2B7A4B" font-size="34">${name.charAt(0)}</tspan><tspan fill="${textColor}">${name.slice(1)}</tspan>
  </text>
</svg>
`;
}

async function ensureLogoFile(
  ctx: GenerateContext,
  logoPath: string,
  variant: 'light' | 'dark'
): Promise<void> {
  const userLogoPath = join(ctx.projectDir, 'public', logoPath.replace(/^\//, ''));
  try {
    await access(userLogoPath);
  } catch {
    const publicDir = join(ctx.appDir, 'public');
    await mkdir(publicDir, { recursive: true });
    const fullPath = join(publicDir, logoPath.replace(/^\//, ''));
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, generateOpenManualLogoSvg(ctx.config.name, variant), 'utf-8');
  }
}

/**
 * Generate meta.json for each sidebar group directory so that
 * fumadocs displays the configured Chinese group name instead of
 * auto-capitalizing the English directory name.
 */
async function generateMetaFiles(ctx: GenerateContext): Promise<void> {
  const sidebar = ctx.config.sidebar;
  if (!sidebar || sidebar.length === 0) return;

  const contentAbsDir = join(ctx.projectDir, ctx.contentDir);

  for (const group of sidebar) {
    // Extract directory prefix from the first page slug that contains "/"
    const dirPrefix = group.pages
      .map((p) => p.slug)
      .find((slug) => slug.includes('/'))
      ?.split('/')[0];

    if (!dirPrefix) continue; // Root-level pages, no meta.json needed

    const dirPath = join(contentAbsDir, dirPrefix);
    const metaPath = join(dirPath, 'meta.json');

    // Skip if meta.json already exists
    try {
      await access(metaPath);
      continue;
    } catch {
      // File doesn't exist, proceed to create it
    }

    await mkdir(dirPath, { recursive: true });
    await writeFile(metaPath, `${JSON.stringify({ title: group.group }, null, 2)}\n`, 'utf-8');
  }
}
