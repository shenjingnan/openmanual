'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export interface NavBarItemProps {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
}

export interface NavBarProps {
  items: NavBarItemProps[];
  height?: string;
  bordered?: boolean;
  className?: string;
}

/**
 * 水平导航栏 — 渲染在 TopBar 下方的文字链接导航条。
 *
 * 特性：
 * - 全宽容器，内层 max-width 与 TopBar 一致
 * - 文字链接 + 激活项下划线指示器
 * - 通过 usePathname 实现路由感知的激活状态
 * - 外部链接使用 <a> 标签，内部使用 Next.js <Link>
 * - 移动端支持横向滚动（隐藏滚动条）
 */
export function NavBar({ items, height = '44px', bordered = true, className }: NavBarProps) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <div
      style={{ height, position: 'sticky' as const, top: 'var(--fd-banner-height)', zIndex: 39 }}
      className={cn(
        'w-full shrink-0 bg-fd-background',
        bordered && 'border-b border-fd-border',
        className
      )}
    >
      <div className="flex items-center h-full mx-auto max-w-[var(--fd-layout-width,97rem)] px-4">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {items.map((item) => (
            <NavBarItem key={item.href} {...item} isActive={isNavItemActive(pathname, item.href)} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function NavBarItem({
  label,
  href,
  external = false,
  isActive,
}: NavBarItemProps & { isActive: boolean }) {
  const linkClassName = cn(
    'relative px-3 py-2 text-sm whitespace-nowrap transition-colors',
    'text-fd-muted-foreground hover:text-fd-foreground',
    isActive && 'text-fd-foreground'
  );

  const content = (
    <>
      {label}
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-fd-primary rounded-full" />
      )}
    </>
  );

  if (external || href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      {content}
    </Link>
  );
}

/**
 * 判断导航项是否处于激活状态。
 *
 * 规则：
 * - 精确匹配：pathname === href
 * - 前缀匹配：pathname 以 href + '/' 开头（目录路径下的子页面）
 */
function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return false;
}
