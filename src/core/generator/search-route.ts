import type { OpenManualConfig } from '../config/schema.js';

/**
 * Orama/FlexSearch 支持的语言映射（来自 fumadocs-core/dist/search/server.js STEMMERS）
 *
 * key = 语言全名（传给 tokenizer 的 language 值），value = 语言代码（locale code）
 *
 * 不在此列表中的语言（如中文 zh）不能作为 language 参数传入，
 * 否则构建时会抛出 "Language X is not supported" 错误。
 * 对于不支持的语言，传入空对象 {} 让 Orama 使用默认分词器。
 */
const SUPPORTED_LOCALE_MAP: Record<string, string> = {
  arabic: 'ar',
  armenian: 'am',
  bulgarian: 'bg',
  czech: 'cz',
  danish: 'dk',
  dutch: 'nl',
  english: 'en',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'gr',
  hungarian: 'hu',
  indian: 'in',
  indonesian: 'id',
  irish: 'ie',
  italian: 'it',
  lithuanian: 'lt',
  nepali: 'np',
  norwegian: 'no',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'rs',
  slovenian: 'ru',
  spanish: 'es',
  swedish: 'se',
  tamil: 'ta',
  turkish: 'tr',
  ukrainian: 'uk',
  sanskrit: 'sk',
};

/**
 * 根据语言代码查找对应的支持的 language 名称
 * 例如：'en' → 'english'，'zh' → undefined（不支持）
 */
function resolveLanguageName(localeCode: string): string | undefined {
  return Object.keys(SUPPORTED_LOCALE_MAP).find((key) => SUPPORTED_LOCALE_MAP[key] === localeCode);
}

export function generateSearchRoute(ctx?: { config: OpenManualConfig }): string {
  const i18nCfg = ctx?.config.i18n;
  const isI18n = i18nCfg?.enabled === true && i18nCfg.languages && i18nCfg.languages.length >= 2;

  // i18n 模式下需要显式配置 localeMap：
  // - 支持的语言映射到对应的 language 名称（如 en → 'english'）
  // - 不支持的语言（如 zh/中文）传空对象，让 Orama 使用默认分词器
  if (isI18n) {
    const localeMapEntries = (i18nCfg?.languages ?? [])
      .map((l) => {
        const langName = resolveLanguageName(l.code);
        if (langName) {
          return `  ${l.code}: '${langName}'`;
        }
        // 不支持的语言（如中文 zh）：传空对象让 Orama 使用默认分词器
        return `  ${l.code}: {}`;
      })
      .join(',\n');

    // 将 localeMap 定义为独立变量（Record<string, unknown>），
    // 再通过 as any 传入 createFromSource 以绕过 fumadocs-core 的严格类型约束。
    // 不能直接在对象字面量中用 (key as any)，因为 Turbopack 不支持该语法。
    return `import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;
const _localeMap: Record<string, unknown> = {
${localeMapEntries},
};
export const { staticGET: GET } = createFromSource(source, {
  localeMap: _localeMap as any,
});
`;
  }

  return `import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
`;
}
