'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';

/** 各语言的搜索占位符文本 */
const PLACEHOLDERS: Record<string, string> = {
  zh: '搜索文档...',
  en: 'Search documents...',
  ja: 'ドキュメントを検索...',
  ko: '문서 검색...',
};

/**
 * TopBar 中间位置的搜索触发器（Mintlify 风格）
 *
 * 渲染为圆角搜索输入框样式，点击后打开 SearchDialog。
 * 仅在 search.position === 'header' 时使用。
 */
export function TopBarSearchTrigger() {
  const { setOpenSearch } = useSearchContext();
  const { locale } = useI18n();

  const placeholder = PLACEHOLDERS[locale ?? 'zh'] ?? PLACEHOLDERS.zh;

  return (
    <button
      type="button"
      onClick={() => setOpenSearch(true)}
      className="
        flex items-center gap-2 w-full max-w-md h-9 px-3
        rounded-lg border border-fd-border bg-fd-muted/50
        text-sm text-fd-muted-foreground
        cursor-pointer transition-colors
        hover:bg-fd-muted hover:border-fd-inputborder
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary
      "
      aria-label={placeholder}
    >
      <Search className="size-4 shrink-0" />
      <span className="flex-1 text-left truncate">{placeholder}</span>
      <kbd
        className="
          inline-flex items-center gap-0.5 h-5 px-1.5 rounded
          border border-fd-border bg-fd-background text-[11px] text-fd-muted-foreground
          font-mono select-none pointer-events-none
        "
      >
        ⌘K
      </kbd>
    </button>
  );
}
