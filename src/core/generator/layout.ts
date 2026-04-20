import type { LogoConfig, OpenManualConfig } from '../config/schema.js';

const IMAGE_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

export function isImagePath(value: string): boolean {
  if (value.startsWith('/')) return true;
  return IMAGE_EXTENSIONS.some((ext) => value.toLowerCase().endsWith(ext));
}

export function resolveLogoPaths(logo: LogoConfig): { light: string; dark: string } {
  if (typeof logo === 'string') {
    return { light: logo, dark: logo };
  }
  return { light: logo.light, dark: logo.dark };
}

/**
 * 将 LogoConfig 解析为 NavLogo 组件的 props 字符串
 *
 * 消除 top-bar.ts 和 layout.ts 中重复的三分支判断。
 */
export function resolveNavLogoProps(logo: LogoConfig | string, alt: string): string {
  if (typeof logo === 'string' && isImagePath(logo)) {
    return `type="image" src="${logo}" alt="${alt}"`;
  }
  if (typeof logo === 'object') {
    const { light, dark } = resolveLogoPaths(logo);
    if (light === dark) {
      return `type="image" src="${light}" alt="${alt}"`;
    }
    return `type="image" srcLight="${light}" srcDark="${dark}" alt="${alt}"`;
  }
  return `type="text" text="${logo}"`;
}

export function generateLayout(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const logo = config.navbar?.logo ?? config.name;
  const isI18n = config.i18n?.enabled === true;

  const logoProps = resolveNavLogoProps(logo, config.name);

  if (isI18n) {
    return `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { ReactNode } from 'react';
import { NavLogo } from 'openmanual/components/nav-layout';

export function baseOptions(_locale: string): BaseLayoutProps {
  return {
    nav: {
      title: <NavLogo ${logoProps} /> as ReactNode,
    },
  };
}
`;
  }

  return `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { ReactNode } from 'react';
import { NavLogo } from 'openmanual/components/nav-layout';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <NavLogo ${logoProps} /> as ReactNode,
    },
  };
}
`;
}
