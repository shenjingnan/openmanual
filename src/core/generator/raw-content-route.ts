import type { OpenManualConfig } from '../config/schema.js';
import { isDirParser } from '../config/schema.js';

export function generateRawContentRoute(ctx: { config: OpenManualConfig }): string {
  const isI18n = ctx.config.i18n?.enabled === true;
  const useDirParser = isDirParser(ctx.config);

  if (isI18n && useDirParser) {
    // === Dir parser 模式：文件在 content/{lang}/{slug}.ext ===
    const defaultLang = ctx.config.i18n?.defaultLanguage ?? ctx.config.locale ?? 'zh';
    return `import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[]; lang: string }> },
) {
  const { path: segments, lang } = await params;
  const slug = segments.join('/');
  const defaultLang = '${defaultLang}';
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

  if (isI18n) {
    // === Dot parser 模式：文件在 content/{slug}.{lang}.ext ===
    const defaultLang = ctx.config.i18n?.defaultLanguage ?? ctx.config.locale ?? 'zh';
    return `import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[]; lang: string }> },
) {
  const { path: segments, lang } = await params;
  const slug = segments.join('/');
  const defaultLang = '${defaultLang}';
  // 尝试带语言后缀的文件，再回退到默认语言文件
  const suffix = lang !== defaultLang ? \`.\${lang}\` : '';
  for (const ext of ['.mdx', '.md']) {
    // 先尝试带后缀
    if (suffix) {
      try {
        const filePath = join(process.cwd(), 'content', \`\${slug}\${suffix}\${ext}\`);
        const content = await readFile(filePath, 'utf-8');
        return new NextResponse(content, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      } catch {
        /* 回退 */
      }
    }
    // 再尝试不带后缀（默认语言或 fallback）
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
