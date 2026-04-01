import type { OpenManualConfig } from '../config/schema.js';

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content',
});

export default defineConfig();
`;
}
