import { isI18nEnabled, type OpenManualConfig } from '../config/schema.js';

/**
 * 生成 lib/i18n.ts
 *
 * 使用 fumadocs-core 的 defineI18n 定义多语言配置。
 */
export function generateI18nConfig(_ctx: { config: OpenManualConfig }): string {
  if (!isI18nEnabled(_ctx.config)) {
    throw new Error('generateI18nConfig called but i18n is not properly configured');
  }
  const i18nCfg = _ctx.config.i18n;
  if (!i18nCfg) {
    throw new Error('generateI18nConfig called but i18n config is missing');
  }

  // 默认语言统一取自顶层 locale（i18n.defaultLanguage 已废弃）
  const defaultLang = _ctx.config.locale ?? 'zh';
  const languageCodes = (i18nCfg.languages ?? []).map((l) => `'${l.code}'`).join(', ');

  return `import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: '${defaultLang}',
  languages: [${languageCodes}],
  parser: 'dir',
});
`;
}
