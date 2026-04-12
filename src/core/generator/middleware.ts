import type { OpenManualConfig } from '../config/schema.js';

/**
 * 生成 middleware.ts（或 proxy.ts）
 *
 * 使用自定义的轻量 i18n 中间件，仅处理：
 * 1. 根路径 / → 重定向到默认语言（如 /zh）
 * 2. 其他所有请求（包括静态资源）→ 直接放行
 *
 * 注意：Next.js 16 已废弃 middleware 推荐使用 proxy，
 * 但 fumadocs-core 尚未提供 createI18nProxy，
 * 因此使用自定义实现避免 createI18nMiddleware 拦截静态资源导致 404。
 */
export function generateMiddleware(_ctx: { config: OpenManualConfig }): string {
  const defaultLang = _ctx.config.i18n?.defaultLanguage ?? _ctx.config.locale ?? 'zh';

  return `import { NextResponse } from 'next/server';

const defaultLanguage = '${defaultLang}';

export default function middleware(request: Request): NextResponse | undefined {
  const { pathname } = new URL(request.url);

  // 仅处理根路径重定向，其他请求（含静态资源）放行
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/' + defaultLanguage, request.url));
  }

  return undefined;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
};
`;
}
