import type { OpenManualConfig } from '../config/schema.js';
import { jsLiteral } from './code-utils.js';

/**
 * 生成 lib/i18n-ui.ts
 *
 * 使用 fumadocs-ui 的 defineI18nUI 定义各语言的 UI 翻译（显示名称等）。
 */
export function generateI18nUI(_ctx: { config: OpenManualConfig }): string {
  const i18nCfg = _ctx.config.i18n;
  if (!i18nCfg?.languages || i18nCfg.languages.length === 0) {
    throw new Error('generateI18nUI called but no languages configured');
  }

  const langEntries = i18nCfg.languages
    .map(
      (lang) => `    ${jsLiteral(lang.code)}: {
      displayName: ${jsLiteral(lang.name)},
    }`
    )
    .join(',\n');

  return `import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

export const i18nUI = defineI18nUI(i18n, {
  translations: {
${langEntries}
  },
});
`;
}
