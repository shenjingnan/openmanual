import type { OpenManualConfig } from '../config/schema.js';

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { z } from 'zod';

function titleFromPath(path: string): string {
  const filename = path.split('/').pop() ?? path;
  return filename.replace(/\\.(md|mdx)$/i, '');
}

export const docs = defineDocs({
  dir: 'content',
  docs: {
    schema: (ctx) =>
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        full: z.boolean().optional(),
      }).transform((data) => ({
        ...data,
        title: data.title ?? titleFromPath(ctx.path),
      })),
  },
});

export default defineConfig({
  mdxOptions: {
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
