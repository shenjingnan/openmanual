import type { OpenManualConfig } from '../config/schema.js';

export function generateLayout(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const navTitle = config.navbar?.logo ?? config.name;

  return `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: '${navTitle}',
    },
  };
}
`;
}
