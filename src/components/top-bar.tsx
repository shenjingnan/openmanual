'use client';

import type { ReactNode } from 'react';

export interface TopBarProps {
  /** 高度值，如 '64px' */
  height: string;
  /** 左侧内容（Logo 等） */
  left?: ReactNode;
  /** 中间内容（搜索框等） */
  center?: ReactNode;
  /** 右侧内容（链接等） */
  right?: ReactNode;
  /** 是否 sticky */
  sticky?: boolean;
  /** 背景色 */
  background?: string;
  /** 是否显示底边框 */
  bordered?: boolean;
}

export function TopBar({
  height,
  left,
  center,
  right,
  sticky = true,
  background,
  bordered = true,
}: TopBarProps) {
  return (
    <>
      {/* 注入 CSS 变量以偏移 Fumadocs 布局 */}
      <style>{`:root { --fd-banner-height: ${height}; }`}</style>
      {/* 外层：全宽背景 + sticky 定位 */}
      <div
        id="om-topbar"
        style={{
          height,
          ...(sticky ? { position: 'sticky' as const, top: 0, zIndex: 40 } : {}),
          ...(background ? { background } : {}),
        }}
        className={`w-full shrink-0 ${
          bordered ? 'border-b border-fd-border' : ''
        } bg-fd-background text-fd-foreground`}
      >
        {/* 内层：与 Fumadocs 内容区（--fd-layout-width）同宽 */}
        <div className="flex items-center justify-between mx-auto max-w-[var(--fd-layout-width,97rem)] px-4 xl:px-8 h-full">
          <div className="flex items-center gap-3 min-w-0">{left}</div>
          <div className="flex items-center justify-center flex-1 min-w-0 px-4 max-md:hidden">
            {center}
          </div>
          <div className="flex items-center gap-4 min-w-0">{right}</div>
        </div>
      </div>
    </>
  );
}
