import { collectConfiguredSlugs, type OpenManualConfig } from '../config/schema.js';

export function generatePage(_ctx: { config: OpenManualConfig }): string {
  const isStrict = _ctx.config.contentPolicy !== 'all';
  const pageActionsEnabled = _ctx.config.pageActions?.enabled !== false;

  const allowedSlugsSnippet = isStrict
    ? `
const allowedSlugs = new Set(${JSON.stringify([...collectConfiguredSlugs(_ctx.config)])});

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

  const pageActionsImport = pageActionsEnabled
    ? "\nimport { PageActions } from '@/components/page-actions';"
    : '';

  const pageTitleArea = pageActionsEnabled
    ? `      <div className="flex items-start justify-between gap-4">
        <div>
          <DocsTitle>{page.data.title}</DocsTitle>
          {page.data.description && (
            <DocsDescription>{page.data.description}</DocsDescription>
          )}
        </div>
        <PageActions />
      </div>`
    : `      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}`;

  return `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Files, File, Folder } from 'fumadocs-ui/components/files';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Mermaid } from '@/components/mermaid';${pageActionsImport}
${allowedSlugsSnippet}
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
${pageTitleArea}
      <DocsBody data-content-area>
        <MDX components={{ ...defaultMdxComponents, Steps, Step, Tabs, Tab, Files, File, Folder, Accordion, Accordions, TypeTable, Mermaid }} />
      </DocsBody>
    </DocsPage>
  );
}
${filterInStaticParams}
`;
}
