'use client';

/**
 * SafeSearchDialog - 安全搜索对话框
 *
 * 基于 fumadocs-ui DefaultSearchDialog 复刻，核心修复：
 * 在传递 items 给 SearchDialogList 前增加 Array.isArray 校验，
 * 防止 query.data 为非数组值时触发 `items?.map is not a function` 报错。
 *
 * 对应源码: fumadocs-ui/dist/components/dialog/search-default.js
 * 修复位置: 原 search-default.js 第 48 行
 *   原: items={query.data !== "empty" ? query.data : defaultItems}
 *   新: items={Array.isArray(query.data) ? query.data : defaultItems}
 */

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
