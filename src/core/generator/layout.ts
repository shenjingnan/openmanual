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

export function generateLayout(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const logo = config.navbar?.logo ?? config.name;

  let logoProps: string;
  if (typeof logo === 'string' && isImagePath(logo)) {
    logoProps = `type: 'image', src: '${logo}', alt: '${config.name}'`;
  } else if (typeof logo === 'object') {
    const { light, dark } = logo;
    if (light === dark) {
      logoProps = `type: 'image', src: '${light}', alt: '${config.name}'`;
    } else {
      logoProps = `type: 'image', srcLight: '${light}', srcDark: '${dark}', alt: '${config.name}'`;
    }
  } else {
    logoProps = `type: 'text', text: '${logo}'`;
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
