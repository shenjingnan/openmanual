import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import { config } from '@/openmanual-config';

const sidebar = config.sidebar ?? [];
const githubLink = config.navbar?.github ?? '';
const navLinks = config.navbar?.links ?? [];
const footerText = config.footer?.text ?? '';

// Build sidebar config for tree restructuring
const sidebarConfig = sidebar.length > 0
  ? sidebar.map((g) => ({
      group: g.group,
      collapsed: g.collapsed,
      pages: g.pages.map((p) => ({ slug: p.slug })),
    }))
  : null;

function slugToUrl(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`;
}

function restructureTree(tree: PageTree.Root): PageTree.Root {
  if (!sidebarConfig) return tree;

  const consumed = new Set<number>();
  const newChildren: PageTree.Node[] = [];

  for (const group of sidebarConfig) {
    const isRootGroup = group.pages.every((p) => !p.slug.includes('/'));

    if (isRootGroup) {
      const folderChildren: PageTree.Node[] = [];
      for (const page of group.pages) {
        const url = slugToUrl(page.slug);
        const idx = (tree.children ?? []).findIndex(
          (c, i) => !consumed.has(i) && c.type === 'page' && c.url === url
        );
        if (idx >= 0) {
          folderChildren.push(tree.children![idx]);
          consumed.add(idx);
        }
      }
      if (folderChildren.length > 0) {
        newChildren.push({
          type: 'folder',
          name: group.group,
          defaultOpen: !group.collapsed,
          children: folderChildren,
        });
      }
    } else {
      const dirPrefix = group.pages.find((p) => p.slug.includes('/'))?.slug.split('/')[0];
      if (dirPrefix) {
        const idx = (tree.children ?? []).findIndex(
          (child, i) =>
            !consumed.has(i) &&
            child.type === 'folder' &&
            child.children?.some(
              (c) => c.type === 'page' && c.url?.startsWith(`/${dirPrefix}/`)
            )
        );
        if (idx >= 0) {
          consumed.add(idx);
          newChildren.push({
            ...(tree.children![idx] as PageTree.Folder),
            name: group.group,
            defaultOpen: !group.collapsed,
          });
        }
      }
    }
  }

  for (let i = 0; i < (tree.children ?? []).length; i++) {
    if (!consumed.has(i)) {
      newChildren.push(tree.children![i]);
    }
  }

  return { ...tree, children: newChildren };
}

const links = navLinks.map((l) => ({ text: l.label, url: l.href, external: true }));

const docsOptions = {
  ...baseOptions(),
  tree: sidebarConfig ? restructureTree(source.getPageTree()) : source.getPageTree(),
  ...(githubLink ? { github: githubLink } : {}),
  ...(links.length > 0 ? { links } : {}),
  ...(footerText ? { footer: { children: footerText } } : {}),
};

export default function DocsLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...docsOptions}>
      {children}
    </DocsLayout>
  );
}
