'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * 主题切换按钮 — 渲染在 TopBar 右侧
 *
 * - light 模式显示 Sun 图标，dark 模式显示 Moon 图标
 * - 使用 mounted 守卫避免 SSR/hydration 不匹配
 * - 图标切换带旋转缩放过渡动画
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR 阶段返回同尺寸占位按钮，避免 hydration 布局跳动
  if (!mounted) {
    return (
      <button
        type="button"
        className={cn('inline-flex items-center justify-center size-5', className)}
        aria-label="切换主题"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative inline-flex items-center justify-center size-5',
        'text-fd-muted-foreground hover:text-fd-foreground transition-colors cursor-pointer',
        className
      )}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <Sun
        className={cn(
          'size-5 absolute transition-all duration-300',
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'size-5 absolute transition-all duration-300',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </button>
  );
}
