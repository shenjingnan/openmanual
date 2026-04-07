import type { GenerateContext } from './index.js';

export function generateOpenManualConfig(ctx: GenerateContext): string {
  const {
    name,
    description,
    navbar,
    footer,
    sidebar,
    theme,
    search,
    pageActions,
    contentPolicy,
    mdx,
  } = ctx.config;
  return `export const config = ${JSON.stringify({ name, description, navbar, footer, sidebar, theme, search, pageActions, contentPolicy, mdx }, null, 2)} as const;
`;
}
