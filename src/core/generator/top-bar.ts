import type { GenerateContext } from './index.js';
import { resolveNavLogoProps } from './layout.js';

export function generateTopBarComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const header = config.header!;
  const height = header.height ?? '64px';
  const sticky = header.sticky ?? true;
  const bordered = header.bordered ?? true;
  const background = header.background ?? '';

  // 处理 Logo — 仅使用 header.logo 或回退到项目名称（不回退到 navbar.logo 避免双 logo）
  const logoSource = header.logo ?? config.name;
  const logoProps = resolveNavLogoProps(logoSource, config.name);

  // 处理链接 — 序列化为 JSON 传给 NavLinks 组件
  const linksJson = JSON.stringify(header.links ?? []);

  const backgroundProp = background ? `\n    background='${background}',` : '';

  // 搜索位置：header 模式下在 center 插槽渲染搜索触发器
  const searchPosition = config.search?.position;
  const isTopBarSearch = searchPosition === 'header';

  const searchImport = isTopBarSearch
    ? "\nimport { TopBarSearchTrigger } from 'openmanual/components/top-bar-search-trigger';"
    : '';

  // 将所有复杂 props 提取为变量，避免 Turbopack 解析行内大 JSON/JSX 时报错
  const centerProp = isTopBarSearch ? '\n      center={searchCenter}' : '';

  return `'use client';

import { TopBar } from 'openmanual/components/top-bar';
import { NavLogo } from 'openmanual/components/nav-layout';
import { NavLinks } from 'openmanual/components/nav-links';${searchImport}

const navLinks = ${linksJson};
${isTopBarSearch ? 'const searchCenter = <TopBarSearchTrigger />;' : ''}

export function OmTopBar() {
  return (
    <TopBar
      height='${height}'
      sticky={${sticky}}${backgroundProp}
      bordered={${bordered}}
      left={<NavLogo ${logoProps} />}${centerProp}
      right={<NavLinks links={navLinks} />}
    />
  );
}
`;
}
