'use client';

import Link from 'next/link';

export interface SiteFooterBrand {
  name?: string;
  description?: string;
  logo?: string | { light: string; dark: string };
}

export interface SiteFooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface SiteFooterColumn {
  title: string;
  links: SiteFooterLink[];
}

export interface SiteSocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface SiteFooterColumns {
  brand?: SiteFooterBrand;
  groups: SiteFooterColumn[];
  social: SiteSocialLink[];
  copyright?: string;
}

export interface SiteFooterProps {
  columns: SiteFooterColumns;
  /** 品牌名称回退值（来自 config.name） */
  defaultName: string;
}

/**
 * 内置社交平台 SVG 图标路径
 */
const SOCIAL_ICONS: Record<string, string> = {
  github:
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

function SocialIcon({ platform, icon }: { platform: string; icon?: string }) {
  if (icon) {
    return <img src={icon} alt={platform} className="h-5 w-5" />;
  }

  const path = SOCIAL_ICONS[platform.toLowerCase()];
  if (!path) {
    return <span className="text-sm font-medium">{platform}</span>;
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/**
 * 多列站点级 Footer 组件
 *
 * 渲染在 DocsLayout 外部（根布局中），包含：
 * - 左侧品牌区域（Logo/名称 + 描述）
 * - 中间多列链接分组
 * - 底部社交媒体图标 + 版权信息
 */
export function SiteFooter({ columns, defaultName }: SiteFooterProps) {
  const { brand, groups, social, copyright } = columns;
  const brandName = brand?.name ?? defaultName;

  return (
    <footer className="border-t border-fd-border bg-fd-background text-fd-muted-foreground mt-auto">
      <div className="mx-auto max-w-[var(--fd-layout-width,97rem)] px-4 py-12">
        {/* 主内容区：品牌 + 链接列 */}
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* 左侧品牌区域 */}
          {(brand?.name || brand?.description || brand?.logo) && (
            <div className="md:w-64 shrink-0">
              {brand?.logo ? (
                typeof brand.logo === 'string' ? (
                  <img src={brand.logo} alt={brandName} className="mb-3 h-8 w-auto" />
                ) : (
                  <img
                    src={brand.logo.light}
                    alt={brandName}
                    className="mb-3 h-8 w-auto dark:hidden"
                  />
                )
              ) : (
                <p className="mb-3 text-lg font-semibold text-fd-foreground">{brandName}</p>
              )}
              {brand?.description && <p className="text-sm leading-relaxed">{brand.description}</p>}
            </div>
          )}

          {/* 右侧多列链接 */}
          {groups.length > 0 && (
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 flex-1">
              {groups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 text-sm font-semibold text-fd-foreground">{group.title}</h3>
                  <ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        {link.external || link.href.startsWith('http') ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm transition-colors hover:text-fd-foreground"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-sm transition-colors hover:text-fd-foreground"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部栏：版权 + 社交图标 */}
        {(social.length > 0 || copyright) && (
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-fd-border pt-8 sm:flex-row">
            {copyright && <p className="text-xs text-fd-muted-foreground">{copyright}</p>}
            {!copyright && <span />}
            {social.length > 0 && (
              <div className="flex items-center gap-4">
                {social.map((s) => {
                  const iconProp = s.icon !== undefined ? { icon: s.icon } : {};
                  return (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.platform}
                      className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                    >
                      <SocialIcon platform={s.platform} {...iconProp} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
