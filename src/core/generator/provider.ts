import type { OpenManualConfig } from '../config/schema.js';

/**
 * 生成 app/provider.tsx
 *
 * 重要：直接从 fumadocs-ui 导入组件，而非通过 openmanual/components/provider 中转。
 * 这避免了 pnpm file: 协议下 fumadocs-ui 被安装两次（一次作为 openmanual 的依赖，
 * 一次作为生成应用的依赖）导致的多实例 React Context 问题。
 */
export function generateProvider(ctx: { config: OpenManualConfig }): string {
  const searchEnabled = ctx.config.search?.enabled !== false;

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
 * 生成 app/components/search-dialog.tsx
 *
 * SafeSearchDialog 组件直接放在生成应用中，确保所有 fumadocs-ui 导入
 * 都来自同一个实例，避免 React Context 跨实例失效的问题。
 */
export function generateSearchDialog(): string {
  return `'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
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
