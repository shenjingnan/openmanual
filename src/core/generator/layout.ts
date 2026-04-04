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

  // String logo that is an image path — backward compatible single image
  if (typeof logo === 'string' && isImagePath(logo)) {
    return `import type { ReactNode } from 'react';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="${logo}" alt="${config.name}" style={{ height: 28 }} />
        </>
      ) as ReactNode,
    },
  };
}
`;
  }

  // Object logo { light, dark }
  if (typeof logo === 'object') {
    const { light, dark } = logo;

    // Same path — treat as single image
    if (light === dark) {
      return `import type { ReactNode } from 'react';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="${light}" alt="${config.name}" style={{ height: 28 }} />
        </>
      ) as ReactNode,
    },
  };
}
`;
    }

    // Different paths — generate two images with dark mode toggle
    return `import type { ReactNode } from 'react';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img src="${light}" alt="${config.name}" style={{ height: 28 }} className="dark:hidden" />
          <img src="${dark}" alt="${config.name}" style={{ height: 28 }} className="hidden dark:block" />
        </>
      ) as ReactNode,
    },
  };
}
`;
  }

  // Plain text logo
  return `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: '${logo}',
    },
  };
}
`;
}
