import {
  buildTitleMap,
  collectConfiguredSlugs,
  isDirParser,
  isI18nEnabled,
  type OpenManualConfig,
} from '../config/schema.js';

export function generateSourceConfig(_ctx: { config: OpenManualConfig }): string {
  const titleMap = buildTitleMap(_ctx.config);
  const titleMapEntries = Object.entries(titleMap)
    .map(([slug, title]) => `  '${slug}': '${title.replace(/'/g, "\\'")}'`)
    .join(',\n');
  const titleMapStr = titleMapEntries ? `{\n${titleMapEntries}\n}` : '{}';

  const isStrict = _ctx.config.contentPolicy !== 'all';
  const isI18n = isI18nEnabled(_ctx.config);
  const useDirParser = isDirParser(_ctx.config);

  const allowedSlugsSnippet = isStrict
    ? `

const allowedSlugs = new Set(${JSON.stringify([...collectConfiguredSlugs(_ctx.config)])});

function slugFromPath(path: string): string {
  const normalized = path.replace(/\\\\/g, '/');
  const idx = normalized.indexOf('content/');
  const relative = idx >= 0 ? normalized.slice(idx + 'content/'.length) : normalized;${
    useDirParser
      ? `
  // dir parser: 剥离语言目录前缀 content/en/guide/configuration.mdx -> guide/configuration
  const parts = relative.split('/');
  if (parts.length > 1 && /^[a-z]{2}(-[A-Z]{2})?$/i.test(parts[0])) {
    return parts.slice(1).join('/').replace(/\\.(md|mdx)$/i, '');
  }
  return relative.replace(/\\.(md|mdx)$/i, '');`
      : `
  let slug = relative.replace(/\\.(md|mdx)$/i, '');
${
  isI18n
    ? `  // 剥离语言后缀：index.en -> index
  slug = slug.replace(/\\.([a-z]{2}(-[A-Z]{2})?)$/, '');`
    : ''
}
  return slug;`
  }
}`
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

  // titleFromPath: dir 模式剥离语言目录前缀，dot 模式（i18n）剥离文件后缀
  const titleFromPathBody = useDirParser
    ? `  const normalized = path.replace(/\\\\/g, '/');
  const idx = normalized.indexOf('content/');
  const relative = idx >= 0 ? normalized.slice(idx + 'content/'.length) : normalized;
  // dir parser: 剥离语言目录前缀 content/en/guide/configuration.mdx -> guide/configuration
  const parts = relative.split('/');
  if (parts.length > 1 && /^[a-z]{2}(-[A-Z]{2})?$/i.test(parts[0])) {
    const slug = parts.slice(1).join('/').replace(/\\.(md|mdx)$/i, '');
    return titleMap[slug] || slug.split('/').pop() || slug;
  }
  const slug = relative.replace(/\\.(md|mdx)$/i, '');
  return titleMap[slug] || slug.split('/').pop() || slug;`
    : `  const normalized = path.replace(/\\\\/g, '/');
  const idx = normalized.indexOf('content/');
  const relative = idx >= 0 ? normalized.slice(idx + 'content/'.length) : normalized;
  let slug = relative.replace(/\\.(md|mdx)$/i, '');
${
  isI18n
    ? `  // 剥离语言后缀：guide/configuration.en -> guide/configuration
  slug = slug.replace(/\\.([a-z]{2}(-[A-Z]{2})?)$/, '');`
    : ''
}
  return titleMap[slug] || slug.split('/').pop() || slug;`;

  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { z } from 'zod';

const titleMap: Record<string, string> = ${titleMapStr};${allowedSlugsSnippet}
function titleFromPath(path: string): string {
${titleFromPathBody}
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
