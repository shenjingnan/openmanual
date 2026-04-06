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

function buildAllowedSlugs(config: OpenManualConfig): Set<string> {
  const slugs = new Set<string>();
  if (config.sidebar) {
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        slugs.add(page.slug);
      }
    }
  }
  return slugs;
}

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  const titleMap = buildTitleMap(_ctx.config);
  const titleMapEntries = Object.entries(titleMap)
    .map(([slug, title]) => `  '${slug}': '${title.replace(/'/g, "\\'")}'`)
    .join(',\n');
  const titleMapStr = titleMapEntries ? `{\n${titleMapEntries}\n}` : '{}';

  const isStrict = _ctx.config.contentPolicy !== 'all';

  const allowedSlugsSnippet = isStrict
    ? `

const allowedSlugs = new Set(${JSON.stringify([...buildAllowedSlugs(_ctx.config)])});

function slugFromPath(path: string): string {
  const normalized = path.replace(/\\\\/g, '/');
  const idx = normalized.indexOf('content/');
  const relative = idx >= 0 ? normalized.slice(idx + 'content/'.length) : normalized;
  return relative.replace(/\\.(md|mdx)$/i, '');
}
`
    : '';

  const filterSnippet = isStrict
    ? `
      .refine((_data) => {
        const slug = slugFromPath(ctx.path);
        if (allowedSlugs.size > 0 && !allowedSlugs.has(slug)) {
          return false;
        }
        return true;
      })`
    : '';

  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { z } from 'zod';

const titleMap: Record<string, string> = ${titleMapStr};${allowedSlugsSnippet}
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
      }))${filterSnippet},
  },
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
