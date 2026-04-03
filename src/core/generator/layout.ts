import type { OpenManualConfig } from '../config/schema.js';

const IMAGE_EXTENSIONS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

export function isImagePath(value: string): boolean {
  if (value.startsWith('/')) return true;
  return IMAGE_EXTENSIONS.some((ext) => value.toLowerCase().endsWith(ext));
}

export function generateLayout(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const logo = config.navbar?.logo ?? config.name;

  if (isImagePath(logo)) {
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
