import type { OpenManualConfig } from '../config/schema.js';

/**
 * 生成 lib/i18n.ts
 *
 * 使用 fumadocs-core 的 defineI18n 定义多语言配置。
 */
export function generateI18nConfig(_ctx: { config: OpenManualConfig }): string {
  const i18nCfg = _ctx.config.i18n;
  if (!i18nCfg?.enabled || !i18nCfg.languages || i18nCfg.languages.length < 2) {
    throw new Error('generateI18nConfig called but i18n is not properly configured');
  }

  // 默认语言统一取自顶层 locale（i18n.defaultLanguage 已废弃）
  const defaultLang = _ctx.config.locale ?? 'zh';
  const languageCodes = i18nCfg.languages.map((l) => `'${l.code}'`).join(', ');
  const parserLine = i18nCfg.parser === 'dir' ? `\n  parser: 'dir',` : '';

  return `import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: '${defaultLang}',
  languages: [${languageCodes}],${parserLine}
});
`;
}
