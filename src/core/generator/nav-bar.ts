import { isI18nEnabled } from '../config/schema.js';
import type { GenerateContext } from './index.js';

/**
 * 生成 app/components/nav-bar.tsx（单语言）或 app/[lang]/components/nav-bar.tsx（i18n）
 *
 * 从 openmanual.json 的 navbar.items 配置读取导航项，
 * 输出配置好的 OmNavBar 组件。
 *
 * i18n 模式下，组件接收 lang prop 并在运行时动态拼接路径前缀。
 */
export function generateNavBarComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const rawItems = config.navbar?.items ?? [];

  if (rawItems.length === 0) {
    return `'use client';

export function OmNavBar() {
  return null;
}
`;
  }

  const itemsJson = JSON.stringify(rawItems);
  const isI18n = isI18nEnabled(config);

  if (isI18n) {
    return `'use client';

import { NavBar } from 'openmanual/components/nav-bar';

const rawNavItems = ${itemsJson};

export function OmNavBar({ lang }: { lang: string }) {
  const items = rawNavItems.map((item) => ({
    ...item,
    href: item.external ? item.href : \`/\${lang}\${item.href.startsWith('/') ? '' : '/'}\${item.href}\`,
  }));
  return <NavBar items={items} />;
}
`;
  }

  return `'use client';

import { NavBar } from 'openmanual/components/nav-bar';

const navItems = ${itemsJson};

export function OmNavBar() {
  return <NavBar items={navItems} />;
}
`;
}
