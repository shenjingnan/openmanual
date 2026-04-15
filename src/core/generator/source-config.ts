import type { OpenManualConfig } from '../config/schema.js';

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  const hasOpenapi = !!_ctx.config.openapi;

  const openapiPluginImport = hasOpenapi
    ? "\nimport { openapiPlugin } from 'fumadocs-openapi/server';"
    : '';

  const pluginsLine = hasOpenapi
    ? "\n  plugins: [openapiPlugin() as never],"
    : '';

  return `${openapiPluginImport}
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: 'content',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid],
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      fallbackLanguage: 'text',
    },
  },${pluginsLine}
});
`;
}
