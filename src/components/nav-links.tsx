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
  /**
   * @internal 生成器注入的内联 SVG 内容。
   * 当 icon 为 .svg 路径且文件读取成功时由生成器注入，
   * 存在时优先以内联 SVG 方式渲染（支持 currentColor 继承）。
   */
  __svgContent?: string;
}

export interface NavLinksProps extends Omit<ComponentProps<'nav'>, 'children'> {
  /** 链接列表 */
  links: NavLinkItem[];
  /** 容器额外 className */
  className?: string;
}

/** 内联 SVG 渲染组件 — 渲染生成器注入并净化的 SVG 内容 */
function InlineSvg({ content, className }: { content: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: content }} />;
}

/**
 * 导航链接组 — 渲染顶部横条右侧的图标/文本链接
 *
 * 支持四种模式：
 * - 内联 SVG + label：内联 SVG 图标带文字（支持 currentColor）
 * - 仅内联 SVG：仅内联 SVG 图标按钮
 * - icon + label：图标（img/lucide）带文字
 * - 仅 icon / 仅 label
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

function NavLinkItemRender({ href, label, icon, external = true, __svgContent }: NavLinkItem) {
  const externalAttrs =
    external !== false ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {};

  const hasIcon = !!icon;
  const hasLabel = !!label;
  const isImage = hasIcon && icon != null && isImagePath(icon);

  // 内联 SVG 模式（优先于 <img>，支持 currentColor 继承）
  if (__svgContent) {
    // 仅内联 SVG 模式
    if (!hasLabel) {
      return (
        <a
          href={href}
          {...externalAttrs}
          className="inline-flex items-center justify-center text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          aria-label={label || icon}
        >
          <InlineSvg content={__svgContent} className="size-5 inline-flex items-center" />
        </a>
      );
    }
    // 内联 SVG + label 模式
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center gap-1.5 text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"
      >
        <InlineSvg content={__svgContent} className="size-5 inline-flex items-center" />
        {label}
      </a>
    );
  }

  // 图片路径 + label 模式
  if (isImage && hasLabel) {
    return (
      <a
        href={href}
        {...externalAttrs}
        className="inline-flex items-center gap-1.5 text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"
      >
        <img src={icon} alt={label} className="size-5" />
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
        <img src={icon} alt={label || icon} className="size-5" />
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
        <DynamicIcon name={icon as any} className="size-5" />
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
        <DynamicIcon name={icon as any} className="size-5" />
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
