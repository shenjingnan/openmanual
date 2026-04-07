'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

function getPageText(): string {
  const article =
    document.querySelector<HTMLElement>('[data-content-area]') ??
    document.querySelector<HTMLElement>('article');
  return article ? article.innerText : '';
}

export function PageActions() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const handleCopyFullText = useCallback(async () => {
    const text = getPageText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 2000);
  }, []);

  const handleViewMarkdown = useCallback(() => {
    const path = window.location.pathname;
    const mdUrl = path === '/' ? '/index.md' : `${path}.md`;
    window.open(mdUrl, '_blank');
    setOpen(false);
  }, []);

  const CopyIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );

  const CheckIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const ChevronDownIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  const ChevronUpIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );

  const FileTextIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );

  return (
    <div ref={menuRef} className="relative">
      <div className={cn(
        'inline-flex items-stretch rounded-xl border border-fd-border',
        'overflow-hidden',
      )}>
        <button
          type="button"
          onClick={handleCopyFullText}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer',
            'text-fd-muted-foreground hover:text-fd-foreground',
            'hover:bg-fd-secondary/80 transition-colors',
          )}
        >
          {copied ? CheckIcon : CopyIcon}
          {copied ? 'Copied!' : 'Copy page'}
        </button>
        <div className="w-px bg-fd-border" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'inline-flex items-center justify-center px-2 py-1.5 cursor-pointer',
            'text-fd-muted-foreground hover:text-fd-foreground',
            'hover:bg-fd-secondary/80 transition-colors',
          )}
          aria-label={open ? '收起菜单' : '展开菜单'}
        >
          {open ? ChevronUpIcon : ChevronDownIcon}
        </button>
      </div>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'min-w-[280px] rounded-xl border border-fd-border',
            'bg-fd-popover p-1 shadow-md',
          )}
        >
          <button
            type="button"
            onClick={handleCopyFullText}
            className={cn(
              'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer',
              'text-fd-popover-foreground',
              'hover:bg-fd-secondary/80 transition-colors',
            )}
          >
            <span className="mt-0.5 text-fd-muted-foreground">
              {copied ? CheckIcon : CopyIcon}
            </span>
            <span className="flex flex-col items-start">
              <span className="font-medium">{copied ? '已复制' : '复制全文'}</span>
              <span className="text-xs text-fd-muted-foreground">复制页面内容，适合 AI 工具使用</span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleViewMarkdown}
            className={cn(
              'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-sm cursor-pointer',
              'text-fd-popover-foreground',
              'hover:bg-fd-secondary/80 transition-colors',
            )}
          >
            <span className="mt-0.5 text-fd-muted-foreground">
              {FileTextIcon}
            </span>
            <span className="flex flex-col items-start">
              <span className="font-medium">查看原文</span>
              <span className="text-xs text-fd-muted-foreground">查看原始 Markdown 源文件</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
