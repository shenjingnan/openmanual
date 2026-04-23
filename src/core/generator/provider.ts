import type { OpenManualConfig } from '../config/schema.js';

/**
 * 生成 app/provider.tsx（或 app/[lang]/provider.tsx）
 *
 * 重要：直接从 fumadocs-ui 导入组件，而非通过 openmanual/components/provider 中转。
 * 这避免了 pnpm file: 协议下 fumadocs-ui 被安装两次（一次作为 openmanual 的依赖，
 * 一次作为生成应用的依赖）导致的多实例 React Context 问题。
 */
export function generateProvider(ctx: { config: OpenManualConfig }): string {
  // 搜索始终启用
  const searchEnabled = true;
  const isI18n = ctx.config.i18n?.enabled === true;

  if (isI18n) {
    return `'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import SafeSearchDialog from './components/search-dialog';
import { i18nUI } from '@/lib/i18n-ui';
import type { ReactNode } from 'react';

export function AppProvider({ children, lang }: { children: ReactNode; lang: string }) {
  return (
    <RootProvider
      i18n={i18nUI.provider(lang)}
      search={{
        enabled: ${searchEnabled},
        SearchDialog: SafeSearchDialog,
        options: { type: 'static', api: '/api/search' },
      }}
    >
      {children}
    </RootProvider>
  );
}
`;
  }

  return `'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import SafeSearchDialog from './components/search-dialog';
import type { ReactNode } from 'react';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        enabled: ${searchEnabled},
        SearchDialog: SafeSearchDialog,
        options: { type: 'static', api: '/api/search' },
      }}
    >
      {children}
    </RootProvider>
  );
}
`;
}

/**
 * 生成 app/components/search-dialog.tsx（或 app/[lang]/components/search-dialog.tsx）
 *
 * SafeSearchDialog 组件直接放在生成应用中，确保所有 fumadocs-ui 导入
 * 都来自同一个实例，避免 React Context 跨实例失效的问题。
 *
 * 重要修复：注入自定义 initOrama 解决 Orama 不支持中文等语言的问题。
 *
 * 问题根因：
 *   fumadocs-core 的 orama-static.js 在运行时调用 create({ language: 'zh' })，
 *   但 @orama/orama 不支持 'zh' 作为 language 参数（仅支持 31 种语言），
 *   会抛出 LANGUAGE_NOT_SUPPORTED 错误导致搜索功能完全失效。
 *
 * 修复方案：
 *   利用 fumadocs-core 的 StaticOptions.initOrama 扩展点，提供自定义的
 *   initOrama 函数。对于 Orama 不支持的语言（如 zh），不传 language 参数，
 *   让 Orama 使用默认的 english 分词器；对于支持的语言正常传入。
 */
export function generateSearchDialog(_ctx?: { config: OpenManualConfig }): string {
  return `'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { create } from '@orama/orama';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
} from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useMemo, useState } from 'react';

/**
 * Orama 支持的语言名称集合。
 *
 * 不在此列表中的语言（如中文 zh）不能作为 language 参数传入 @orama/orama 的 create()，
 * 否则会抛出 LANGUAGE_NOT_SUPPORTED 错误导致搜索功能完全失效。
 *
 * 来源：@orama/orama 内部的 SUPPORTED_LANGUAGES 列表，
 * 与 fumadocs-core/dist/search/server.js 中的 STEMMERS 保持一致。
 */
const SUPPORTED_ORAMA_LANGUAGES = new Set([
  'arabic', 'armenian', 'bulgarian', 'czech', 'danish', 'dutch',
  'english', 'finnish', 'french', 'german', 'greek', 'hungarian',
  'indian', 'indonesian', 'irish', 'italian', 'lithuanian', 'nepali',
  'norwegian', 'portuguese', 'romanian', 'russian', 'serbian',
  'slovenian', 'spanish', 'swedish', 'tamil', 'turkish',
  'ukrainian', 'sanskrit',
]);

/**
 * 将 locale code（如 'zh', 'en'）映射为 Orama 支持的 language 全名。
 *
 * 对于不支持的语言返回 undefined，此时 create() 不传 language 参数，
 * Orama 会默认使用 english 分词器（对中文等语言做基本的空格/标点分词）。
 */
function resolveOramaLanguage(localeCode: string): string | undefined {
  const map: Record<string, string> = {
    ar: 'arabic', am: 'armenian', bg: 'bulgarian', cz: 'czech',
    dk: 'danish', nl: 'dutch', en: 'english', fi: 'finnish',
    fr: 'french', de: 'german', gr: 'greek', hu: 'hungarian',
    in: 'indian', id: 'indonesian', ie: 'irish', it: 'italian',
    lt: 'lithuanian', np: 'nepali', no: 'norwegian', pt: 'portuguese',
    ro: 'romanian', ru: 'russian', rs: 'serbian', sl: 'slovenian',
    es: 'spanish', se: 'swedish', ta: 'tamil', tr: 'turkish',
    uk: 'ukrainian', sk: 'sanskrit',
  };
  const langName = map[localeCode];
  return langName && SUPPORTED_ORAMA_LANGUAGES.has(langName) ? langName : undefined;
}

interface SafeSearchDialogProps {
  defaultTag?: string;
  tags?: { value: string; name: string }[];
  api?: string;
  delayMs?: number;
  type?: 'fetch' | 'static';
  allowClear?: boolean;
  links?: [string, string][];
  footer?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SafeSearchDialog({
  defaultTag,
  tags = [],
  api,
  delayMs,
  type = 'fetch',
  allowClear = false,
  links = [],
  footer,
  open = false,
  onOpenChange = (): void => {},
}: SafeSearchDialogProps) {
  const { locale } = useI18n();
  const [tag, setTag] = useState(defaultTag);

  /**
   * 自定义 initOrama：根据 locale 是否受 Orama 支持，决定是否传入 language 参数。
   *
   * 这解决了 Orama 不支持 'zh' 等语言时抛出 LANGUAGE_NOT_SUPPORTED 导致搜索失效的问题。
   * fumadocs-core 的 StaticOptions 类型已官方暴露 initOrama 参数供此用途。
   */
  const safeInitOrama = useMemo(
    () => (localeCode?: string) => {
      const lang = localeCode ? resolveOramaLanguage(localeCode) : undefined;
      return create({
        schema: { _: 'string' },
        ...(lang ? { language: lang } : {}),
      });
    },
    [],
  );

  const { search, setSearch, query } = useDocsSearch(
    type === 'fetch'
      ? {
          type: 'fetch',
          ...(api != null && { api }),
          ...(locale != null && { locale }),
          ...(tag != null && { tag }),
          ...(delayMs != null && { delayMs }),
        }
      : {
          type: 'static',
          ...(api != null && { from: api }),
          ...(locale != null && { locale }),
          ...(tag != null && { tag }),
          ...(delayMs != null && { delayMs }),
          initOrama: safeInitOrama,
        }
  );

  const defaultItems = useMemo(() => {
    if (links.length === 0) return null;
    return links.map(([name, link]) => ({
      type: 'page' as const,
      id: name,
      content: name,
      url: link,
    }));
  }, [links]);

  useOnChange(defaultTag, (v) => {
    setTag(v);
  });

  // 核心修复：使用 Array.isArray 守卫，防止非数组值导致 .map() 报错
  const safeItems = Array.isArray(query.data) ? query.data : defaultItems;

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={safeItems} />
      </SearchDialogContent>
      <SearchDialogFooter>
        {tags.length > 0 && (
          <TagsList {...(tag != null && { tag })} onTagChange={setTag} allowClear={allowClear}>
            {tags.map((tagItem) => (
              <TagsListItem key={tagItem.value} value={tagItem.value}>
                {tagItem.name}
              </TagsListItem>
            ))}
          </TagsList>
        )}
        {footer}
      </SearchDialogFooter>
    </SearchDialog>
  );
}
`;
}
