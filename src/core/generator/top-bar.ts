import type { GenerateContext } from './index.js';
import { resolveNavLogoProps } from './layout.js';

export function generateTopBarComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const header = config.header!;
  const height = header.height ?? '64px';
  const sticky = header.sticky ?? true;
  const bordered = header.bordered ?? true;
  const background = header.background ?? '';

  // 处理 Logo — 复用共享工具函数消除重复
  const logoSource = header.logo ?? config.navbar?.logo ?? config.name;
  const logoProps = resolveNavLogoProps(logoSource, config.name);

  // 处理链接 — 序列化为 JSON 传给 NavLinks 组件
  const linksJson = JSON.stringify(header.links ?? []);

  const backgroundProp = background ? `\n    background='${background}',` : '';

  return `'use client';

import { TopBar } from 'openmanual/components/top-bar';
import { NavLogo } from 'openmanual/components/nav-layout';
import { NavLinks } from 'openmanual/components/nav-links';

export function OmTopBar() {
  return (
    <TopBar
      height='${height}'
      sticky={${sticky}}${backgroundProp}
      bordered={${bordered}}
      left={<NavLogo ${logoProps} />}
      right={<NavLinks links={${linksJson}} />}
    />
  );
}
`;
}
