import type { OpenManualConfig } from '../config/schema.js';

/**
 * 生成 middleware.ts
 *
 * 使用 fumadocs-core 的 createI18nMiddleware 处理语言路由重定向。
 * 将根路径 / 重定向到默认语言路径（如 /zh）。
 */
export function generateMiddleware(_ctx: { config: OpenManualConfig }): string {
  return `import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
`;
}
