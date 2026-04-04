import type { OpenManualConfig } from '../config/schema.js';

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

export function generatePage(_ctx: { config: OpenManualConfig }): string {
  const isStrict = _ctx.config.contentPolicy !== 'all';

  const allowedSlugsSnippet = isStrict
    ? `
const allowedSlugs = new Set(${JSON.stringify([...buildAllowedSlugs(_ctx.config)])});

function isAllowed(slug: string[] | undefined): boolean {
  if (allowedSlugs.size === 0) return true;
  const key = slug ? slug.join('/') : 'index';
  return allowedSlugs.has(key);
}
`
    : '';

  const filterInPage = isStrict
    ? `
  if (!isAllowed(slug)) {
    notFound();
  }
`
    : '';

  const filterInStaticParams = isStrict
    ? `
export function generateStaticParams() {
  let params = source.generateParams();
  params = params.filter((p: { slug: string[] }) => isAllowed(p.slug));
  if (!params.some((p: { slug: string[] }) => p.slug.length === 0)) {
    params.unshift({ ...params[0], slug: [] });
  }
  return params;
}`
    : `
export function generateStaticParams() {
  const params = source.generateParams();
  if (!params.some((p: { slug: string[] }) => p.slug.length === 0)) {
    params.unshift({ ...params[0], slug: [] });
  }
  return params;
}`;

  return `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';${allowedSlugsSnippet}
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
${filterInPage}
  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}
${filterInStaticParams}
`;
}
