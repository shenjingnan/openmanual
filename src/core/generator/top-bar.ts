import type { TopBarConfig } from '../config/schema.js';
import type { GenerateContext } from './index.js';
import { resolveNavLogoProps } from './layout.js';

export function generateTopBarComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const header: Partial<TopBarConfig> = config.header ?? {};
  const height = header.height ?? '64px';
  const sticky = header.sticky ?? true;
  const bordered = header.bordered ?? true;
  const background = header.background ?? '';

  // Logo 解析优先级（由 mergeDefaults 处理）：
  // 1. config.logo → 已传播到 header.logo
  // 2. header.logo（旧配置）
  // 3. 回退到 config.name（文本 logo）
  const logoSource = header.logo ?? config.name;
  const logoProps = resolveNavLogoProps(logoSource, config.name);

  // 处理链接 — 序列化为 JSON 传给 NavLinks 组件
  const linksJson = JSON.stringify(header.links ?? []);

  const backgroundProp = background ? `\n    background='${background}',` : '';

  // 搜索始终在 header 中展示
  const searchImport =
    "\nimport { TopBarSearchTrigger } from 'openmanual/components/top-bar-search-trigger';";

  // 主题切换按钮
  const themeToggleImport = "\nimport { ThemeToggle } from 'openmanual/components/theme-toggle';";

  // 将所有复杂 props 提取为变量，避免 Turbopack 解析行内大 JSON/JSX 时报错
  const centerProp = '\n      center={searchCenter}';

  return `'use client';

import { TopBar } from 'openmanual/components/top-bar';
import { NavLogo } from 'openmanual/components/nav-layout';
import { NavLinks } from 'openmanual/components/nav-links';${searchImport}${themeToggleImport}

const navLinks = ${linksJson};
const searchCenter = <TopBarSearchTrigger />;

export function OmTopBar() {
  return (
    <TopBar
      height='${height}'
      sticky={${sticky}}${backgroundProp}
      bordered={${bordered}}
      left={<NavLogo ${logoProps} />}${centerProp}
      right={
        <>
          <NavLinks links={navLinks} />
          <ThemeToggle />
        </>
      }
    />
  );
}
`;
}
