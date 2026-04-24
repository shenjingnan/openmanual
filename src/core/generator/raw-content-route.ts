import { isI18nEnabled, type OpenManualConfig } from '../config/schema.js';

export function generateRawContentRoute(ctx: { config: OpenManualConfig }): string {
  const isI18n = isI18nEnabled(ctx.config);

  if (isI18n) {
    // === Dir parser 模式（唯一模式）：文件在 content/{lang}/{slug}.ext ===
    // 默认语言统一取自顶层 locale（i18n.defaultLanguage 已废弃）
    const defaultLang = ctx.config.locale ?? 'zh';
    return `import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

const _defaultLang = '${defaultLang}';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const slug = segments.join('/');
  // 从查询参数获取语言，回退到默认语言（API 路由不在 [lang] 路径段下）
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') ?? _defaultLang;
  // dir parser: 文件位于 content/{lang}/{slug}.ext
  for (const ext of ['.mdx', '.md']) {
    try {
      const filePath = join(process.cwd(), 'content', lang, \`\${slug}\${ext}\`);
      const content = await readFile(filePath, 'utf-8');
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch {
      /* try next extension */
    }
  }
  return new NextResponse('Not found', { status: 404 });
}
`;
  }

  return `import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const slug = segments.join('/');
  for (const ext of ['.mdx', '.md']) {
    try {
      const filePath = join(process.cwd(), 'content', \`\${slug}\${ext}\`);
      const content = await readFile(filePath, 'utf-8');
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch {
      /* try next extension */
    }
  }
  return new NextResponse('Not found', { status: 404 });
}
`;
}
