import type { OpenManualConfig } from '../config/schema.js';
import { isI18nEnabled, isOpenApiEnabled } from '../config/schema.js';

export function generatePage(_ctx: { config: OpenManualConfig; allSlugs?: Set<string> }): string {
  const isStrict = _ctx.config.contentPolicy !== 'all';
  const pageActionsEnabled = _ctx.config.pageActions?.enabled !== false;
  const isI18n = isI18nEnabled(_ctx.config);
  const isOApi = isOpenApiEnabled(_ctx.config);
  const allSlugs = _ctx.allSlugs ?? new Set<string>();

  if (isI18n) {
    return generatePageI18n(_ctx, isStrict, pageActionsEnabled, allSlugs, isOApi);
  }

  return generatePageSingle(_ctx, isStrict, pageActionsEnabled, allSlugs, isOApi);
}

function generatePageSingle(
  _ctx: { config: OpenManualConfig },
  isStrict: boolean,
  pageActionsEnabled: boolean,
  allSlugs: Set<string>,
  isOApi: boolean
): string {
  const allowedSlugsSnippet = isStrict
    ? `
const allowedSlugs = new Set<string>(${JSON.stringify([...allSlugs])});

function isAllowed(slug: string[] | undefined): boolean {
  if (allowedSlugs.size === 0) return true;
  const key = slug && slug.length > 0 ? slug.join('/') : 'index';
  return allowedSlugs.has(key) || (slug?.[0] === 'openapi') || (slug?.[0] === 'api');
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

  const apiPageImport = isOApi ? "\nimport { APIPage } from '@/components/api-page';" : '';

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

  // OpenAPI 页面渲染分支
  const openapiBranch = isOApi
    ? `
  if (page.data.type === 'openapi') {
    return (
      <DocsPage full>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
        <DocsBody>
          <APIPage {...(page.data as any).getAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }
`
    : '';

  return `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Files, File, Folder } from 'fumadocs-ui/components/files';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Mermaid } from '@/components/mermaid';
import { Callout, CalloutTitle, CalloutDescription } from '@/components/callout';${pageActionsImport}${apiPageImport}
${allowedSlugsSnippet}
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
${filterInPage}
  if (!page) {
    notFound();
  }
${openapiBranch}
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
${pageTitleArea}
      <DocsBody data-content-area>
        <MDX components={{ ...defaultMdxComponents, Steps, Step, Tabs, Tab, 'Tabs.Tab': Tab, Files, File, Folder, Accordion, Accordions, TypeTable, Mermaid, Callout, CalloutTitle, CalloutDescription }} />
      </DocsBody>
    </DocsPage>
  );
}
${filterInStaticParams}
`;
}

function generatePageI18n(
  _ctx: { config: OpenManualConfig },
  isStrict: boolean,
  pageActionsEnabled: boolean,
  allSlugs: Set<string>,
  isOApi: boolean
): string {
  const allowedSlugsSnippet = isStrict
    ? `
const allowedSlugs = new Set<string>(${JSON.stringify([...allSlugs])});

function isAllowed(slug: string[] | undefined, lang?: string): boolean {
  if (allowedSlugs.size === 0) return true;
  const rawKey = slug && slug.length > 0 ? slug.join('/') : 'index';
  const key = lang ? \`\${lang}/\${rawKey}\` : rawKey;
  return allowedSlugs.has(key) || (slug?.[0] === 'openapi') || (slug?.[0] === 'api');
}
`
    : '';

  const filterInPage = isStrict
    ? `
  if (!isAllowed(slug, lang)) {
    notFound();
  }
`
    : '';

  const filterInStaticParams = isStrict
    ? `
export function generateStaticParams() {
  let params = source.generateParams();
  params = params.filter((p: { slug: string[]; lang: string }) => isAllowed(p.slug, p.lang));
  // Ensure every language has a homepage entry (slug: [])
  const languages = [...new Set(params.map((p: { lang: string }) => p.lang))];
  for (const lang of languages) {
    if (!params.some((p: { slug: string[]; lang: string }) => p.slug.length === 0 && p.lang === lang)) {
      const firstForLang = params.find((p: { slug: string[]; lang: string }) => p.lang === lang);
      if (firstForLang) {
        params.unshift({ ...firstForLang, slug: [] });
      }
    }
  }
  return params;
}`
    : `
export function generateStaticParams() {
  const params = source.generateParams();
  // Ensure every language has a homepage entry (slug: [])
  const languages = [...new Set(params.map((p: { lang: string }) => p.lang))];
  for (const lang of languages) {
    if (!params.some((p: { slug: string[]; lang: string }) => p.slug.length === 0 && p.lang === lang)) {
      const firstForLang = params.find((p: { slug: string[]; lang: string }) => p.lang === lang);
      if (firstForLang) {
        params.unshift({ ...firstForLang, slug: [] });
      }
    }
  }
  return params;
}`;

  const pageActionsImport = pageActionsEnabled
    ? "\nimport { PageActions } from '@/components/page-actions';"
    : '';

  const apiPageImport = isOApi ? "\nimport { APIPage } from '@/components/api-page';" : '';

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

  // OpenAPI 页面渲染分支（i18n 模式）
  const openapiBranch = isOApi
    ? `
  if (page.data.type === 'openapi') {
    return (
      <DocsPage full>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
        <DocsBody>
          <APIPage {...(page.data as any).getAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }
`
    : '';

  return `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Files, File, Folder } from 'fumadocs-ui/components/files';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Mermaid } from '@/components/mermaid';
import { Callout, CalloutTitle, CalloutDescription } from '@/components/callout';${pageActionsImport}${apiPageImport}
${allowedSlugsSnippet}
export default async function Page({ params }: { params: Promise<{ slug?: string[]; lang: string }> }) {
  const { slug, lang } = await params;
  const page = source.getPage(slug, lang);
${filterInPage}
  if (!page) {
    notFound();
  }
${openapiBranch}
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
${pageTitleArea}
      <DocsBody data-content-area>
        <MDX components={{ ...defaultMdxComponents, Steps, Step, Tabs, Tab, 'Tabs.Tab': Tab, Files, File, Folder, Accordion, Accordions, TypeTable, Mermaid, Callout, CalloutTitle, CalloutDescription }} />
      </DocsBody>
    </DocsPage>
  );
}
${filterInStaticParams}
`;
}
