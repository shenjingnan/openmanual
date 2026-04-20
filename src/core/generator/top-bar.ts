import type { GenerateContext } from './index.js';
import { isImagePath, resolveLogoPaths } from './layout.js';

export function generateTopBarComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const header = config.header!;
  const height = header.height ?? '64px';
  const sticky = header.sticky ?? true;
  const bordered = header.bordered ?? true;
  const background = header.background ?? '';

  // 处理 Logo
  let logoJsx: string;
  if (header.logo) {
    if (typeof header.logo === 'string' && isImagePath(header.logo)) {
      logoJsx = `<NavLogo type="image" src="${header.logo}" alt="${config.name}" />`;
    } else if (typeof header.logo === 'object') {
      const { light, dark } = resolveLogoPaths(header.logo);
      if (light === dark) {
        logoJsx = `<NavLogo type="image" src="${light}" alt="${config.name}" />`;
      } else {
        logoJsx = `<NavLogo type="image" srcLight="${light}" srcDark="${dark}" alt="${config.name}" />`;
      }
    } else {
      logoJsx = `<NavLogo type="text" text="${header.logo}" />`;
    }
  } else {
    // 默认使用 navbar 的 logo 或项目名称
    const navLogo = config.navbar?.logo ?? config.name;
    if (typeof navLogo === 'string' && isImagePath(navLogo)) {
      logoJsx = `<NavLogo type="image" src="${navLogo}" alt="${config.name}" />`;
    } else if (typeof navLogo === 'object') {
      const { light, dark } = resolveLogoPaths(navLogo);
      if (light === dark) {
        logoJsx = `<NavLogo type="image" src="${light}" alt="${config.name}" />`;
      } else {
        logoJsx = `<NavLogo type="image" srcLight="${light}" srcDark="${dark}" alt="${config.name}" />`;
      }
    } else {
      logoJsx = `<NavLogo type="text" text="${navLogo}" />`;
    }
  }

  // 处理链接 — 支持 icon / label / icon+label 三种模式
  const links = header.links ?? [];
  const hasAnyIcon = links.some((l) => l.icon);
  const linksJsx =
    links.length > 0
      ? links
          .map((l) => {
            const external =
              l.external !== false ? ` target="_blank" rel="noopener noreferrer"` : '';
            const hasIcon = !!l.icon;
            const hasLabel = !!l.label;

            if (hasIcon && hasLabel) {
              return `<a href="${l.href}"${external} className="inline-flex items-center gap-1.5 text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap"><DynamicIcon name="${l.icon}" className="size-4" />${l.label}</a>`;
            }
            if (hasIcon) {
              return `<a href="${l.href}"${external} className="inline-flex items-center justify-center text-fd-muted-foreground hover:text-fd-foreground transition-colors" aria-label="${l.icon}"><DynamicIcon name="${l.icon}" className="size-4" /></a>`;
            }
            return `<a href="${l.href}"${external} className="text-md text-fd-muted-foreground hover:text-fd-foreground transition-colors whitespace-nowrap">${l.label}</a>`;
          })
          .join('\n          ')
      : '';

  const backgroundProp = background ? `\n    background='${background}',` : '';
  const dynamicIconImport = hasAnyIcon
    ? `\nimport { DynamicIcon } from 'lucide-react/dynamic';`
    : '';

  return `'use client';

import { TopBar } from 'openmanual/components/top-bar';
import { NavLogo } from 'openmanual/components/nav-layout';${dynamicIconImport}

export function OmTopBar() {
  return (
    <TopBar
      height='${height}'
      sticky={${sticky}}${backgroundProp}
      bordered={${bordered}}
      left={${logoJsx}}
      right={
        <nav className="flex items-center gap-4">
          ${linksJsx}
        </nav>
      }
    />
  );
}
`;
}
