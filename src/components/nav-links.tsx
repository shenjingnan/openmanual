'use client';

import { DynamicIcon } from 'lucide-react/dynamic';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** 图片路径检测：判断 icon 值是否为图片文件路径 */
function isImagePath(value: string): boolean {
  return (
    /^\//i.test(value) || /^\.\.?\//i.test(value) || /\.(svg|png|jpe?g|gif|webp)$/i.test(value)
  );
}

/** 单个导航链接项的配置 */
export interface NavLinkItem {
  /** 链接地址 */
  href: string;
  /** 显示文本 */
  label?: string;
  /** lucide-react 图标名称，或图片文件路径（如 /icons/foo.svg） */
  icon?: string;
  /** 是否在新窗口打开（默认 true） */
  external?: boolean;
}

export interface NavLinksProps extends Omit<ComponentProps<'nav'>, 'children'> {
  /** 链接列表 */
  links: NavLinkItem[];
  /** 容器额外 className */
  className?: string;
}

/**
 * 导航链接组 — 渲染顶部横条右侧的图标/文本链接
 *
 * 支持三种模式：
 * - icon + label：图标带文字
 * - 仅 icon：仅图标按钮（带 aria-label 无障碍）
 * - 仅 label：纯文字链接
 */
export function NavLinks({ links, className = '', ...props }: NavLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav className={cn('flex items-center gap-4', className)} {...props}>
      {links.map((link) => (
        <NavLinkItemRender key={link.href} {...link} />
      ))}
    </nav>
  );
}

function NavLinkItemRender({ href, label, icon, external = true }: NavLinkItem) {
  const externalAttrs =
    external !== false ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {};

  const hasIcon = !!icon;
  const hasLabel = !!label;
  const isImage = hasIcon && isImagePath(icon!);

  // 图片路径 + label 模式
  if (isImage && hasLabel) {
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center gap-1.5 text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"
      >
        <img src={icon} alt={label} className="size-4" />
        {label}
      </a>
    );
  }

  // 仅图片路径模式
  if (isImage) {
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center justify-center text-fd-muted-foreground hover:text-fd-foreground transition-colors"
        aria-label={label || icon}
      >
        <img src={icon} alt={label || icon} className="size-4" />
      </a>
    );
  }

  // lucide 图标 + label 模式
  if (hasIcon && hasLabel) {
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center gap-1.5 text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"
      >
        <DynamicIcon name={icon as any} className="size-4" />
        {label}
      </a>
    );
  }

  // 仅 lucide 图标模式
  if (hasIcon) {
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center justify-center text-fd-muted-foreground hover:text-fd-foreground transition-colors"
        aria-label={icon}
      >
        <DynamicIcon name={icon as any} className="size-4" />
      </a>
    );
  }

  // 仅 label 模式
  return (
    <a
      href={href}
      {...externalAttrs}
      className="text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"
    >
      {label}
    </a>
  );
}
