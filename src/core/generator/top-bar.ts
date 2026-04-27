import type { TopBarConfig } from '../config/schema.js';
import { isI18nEnabled } from '../config/schema.js';
import { isSvgPath, readAndSanitizeSvg } from './code-utils.js';
import type { GenerateContext } from './index.js';
import { resolveNavLogoProps } from './layout.js';

export async function generateTopBarComponent(ctx: GenerateContext): Promise<string> {
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

  // 处理链接 — 对 .svg 图标读取文件内容并内嵌，支持 currentColor 继承
  const rawLinks = header.links ?? [];
  const enrichedLinks = await Promise.all(
    rawLinks.map(async (link) => {
      if (!link.icon || !isSvgPath(link.icon)) return link;
      const svgContent = await readAndSanitizeSvg(ctx.projectDir, link.icon);
      if (!svgContent) return link;
      return { ...link, __svgContent: svgContent };
    })
  );
  const linksJson = JSON.stringify(enrichedLinks);

  const backgroundProp = background ? `\n    background='${background}',` : '';

  // 搜索始终在 header 中展示
  const searchImport =
    "\nimport { TopBarSearchTrigger } from 'openmanual/components/top-bar-search-trigger';";

  // 主题切换按钮
  const themeToggleImport = "\nimport { ThemeToggle } from 'openmanual/components/theme-toggle';";

  // 多语言切换按钮（仅 i18n 启用时引入）
  const isI18n = isI18nEnabled(config);
  const languageSwitchImport = isI18n
    ? "\nimport { LanguageSwitch } from 'openmanual/components/language-switch';"
    : '';

  // 将所有复杂 props 提取为变量，避免 Turbopack 解析行内大 JSON/JSX 时报错
  const centerProp = '\n      center={searchCenter}';

  // 条件性构建 right 区域内容
  const rightJsx = isI18n
    ? `        <>
          <NavLinks links={navLinks} />
          <ThemeToggle />
          <LanguageSwitch />
        </>`
    : `        <>
          <NavLinks links={navLinks} />
          <ThemeToggle />
        </>`;

  return `'use client';

import { TopBar } from 'openmanual/components/top-bar';
import { NavLogo } from 'openmanual/components/nav-layout';
import { NavLinks } from 'openmanual/components/nav-links';${searchImport}${themeToggleImport}${languageSwitchImport}

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
${rightJsx}
      }
    />
  );
}
`;
}
