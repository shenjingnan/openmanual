import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Files, File, Folder } from 'fumadocs-ui/components/files';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Mermaid } from '@/components/mermaid';
import { PageActions } from '@/components/page-actions';
import { config } from '@/openmanual-config';

const isStrict = config.contentPolicy !== 'all';
const pageActionsEnabled = config.pageActions?.enabled !== false;
const allowedSlugs = new Set(
  config.sidebar?.flatMap((g) => g.pages.map((p) => p.slug)) ?? [],
);

function isAllowed(slug: string[] | undefined): boolean {
  if (allowedSlugs.size === 0) return true;
  const key = slug ? slug.join('/') : 'index';
  return allowedSlugs.has(key);
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (isStrict && !isAllowed(slug)) {
    notFound();
  }
  if (!page) {
    notFound();
  }
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      {pageActionsEnabled ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <DocsTitle>{page.data.title}</DocsTitle>
            {page.data.description && (
              <DocsDescription>{page.data.description}</DocsDescription>
            )}
          </div>
          <PageActions />
        </div>
      ) : (
        <>
          <DocsTitle>{page.data.title}</DocsTitle>
          {page.data.description && (
            <DocsDescription>{page.data.description}</DocsDescription>
          )}
        </>
      )}
      <DocsBody data-content-area>
        <MDX components={{
          ...defaultMdxComponents, Steps, Step, Tabs, Tab,
          Files, File, Folder, Accordion, Accordions, TypeTable, Mermaid,
        }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  let params = source.generateParams();
  if (isStrict) {
    params = params.filter((p: { slug: string[] }) => isAllowed(p.slug));
  }
  if (!params.some((p: { slug: string[] }) => p.slug.length === 0)) {
    params.unshift({ ...params[0], slug: [] });
  }
  return params;
}
