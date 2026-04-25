'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * 多语言切换按钮 — 渲染在 TopBar 右侧（ThemeToggle 旁边）
 *
 * - 显示 Languages 图标 + 当前语言名 + 下拉箭头
 * - 点击展开语言列表下拉菜单
 * - 通过 fumadocs useI18n().onChange 实现 URL 路径前缀切换
 * - 仅当 i18n 启用（配置了 >= 2 种语言）时由生成器条件引入
 * - 使用 mounted 守卫避免 SSR/hydration 不匹配
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { locale, locales, onChange } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // SSR 阶段返回同尺寸占位，避免 hydration 布局跳动
  if (!mounted || !locale) {
    return <div className={cn('inline-flex items-center justify-center size-5', className)} />;
  }

  const currentLocaleName = locales?.find((l) => l.locale === locale)?.name ?? locale;

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5',
          'text-sm text-fd-muted-foreground hover:text-fd-foreground',
          'transition-colors cursor-pointer'
        )}
        aria-label="切换语言"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Languages className="size-4 shrink-0" />
        <span className="max-w-[100px] truncate">{currentLocaleName}</span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* 下拉菜单 */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'min-w-[160px] rounded-lg border border-fd-border',
            'bg-fd-popover p-1 shadow-md'
          )}
          role="menu"
        >
          {locales?.map((item) => (
            <button
              key={item.locale}
              type="button"
              role="menuitem"
              onClick={() => {
                onChange?.(item.locale);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm cursor-pointer',
                'transition-colors',
                item.locale === locale
                  ? 'bg-fd-secondary text-fd-foreground font-medium'
                  : 'text-fd-popover-foreground hover:bg-fd-secondary/80'
              )}
            >
              <span>{item.name}</span>
              {item.locale === locale && <Check className="size-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
