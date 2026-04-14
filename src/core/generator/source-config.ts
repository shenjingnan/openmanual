import type { OpenManualConfig } from '../config/schema.js';

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
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
  },
});
`;
}
