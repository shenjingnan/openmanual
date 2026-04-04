import type { OpenManualConfig } from '../config/schema.js';

function buildTitleMap(config: OpenManualConfig): Record<string, string> {
  const map: Record<string, string> = {};
  if (config.sidebar) {
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        map[page.slug] = page.title;
      }
    }
  }
  return map;
}

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  const titleMap = buildTitleMap(_ctx.config);
  const titleMapEntries = Object.entries(titleMap)
    .map(([slug, title]) => `  '${slug}': '${title.replace(/'/g, "\\'")}'`)
    .join(',\n');
  const titleMapStr = titleMapEntries ? `{\n${titleMapEntries}\n}` : '{}';

  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { z } from 'zod';

const titleMap: Record<string, string> = ${titleMapStr};

function titleFromPath(path: string): string {
  const normalized = path.replace(/\\\\/g, '/');
  const idx = normalized.indexOf('content/');
  const relative = idx >= 0 ? normalized.slice(idx + 'content/'.length) : normalized;
  const slug = relative.replace(/\\.(md|mdx)$/i, '');
  return titleMap[slug] || slug.split('/').pop() || slug;
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
