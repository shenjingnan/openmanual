import type * as PageTree from 'fumadocs-core/page-tree';

export interface SidebarConfigEntry {
  group: string;
  collapsed?: boolean;
  pages: readonly { slug: string }[];
}

export function slugToUrl(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`;
}

export function restructureTree(
  tree: PageTree.Root,
  sidebarConfig: readonly SidebarConfigEntry[]
): PageTree.Root {
  const consumed = new Set<number>();
  const newChildren: PageTree.Node[] = [];
  const children = tree.children ?? [];

  for (const group of sidebarConfig) {
    const isRootGroup = group.pages.every((p) => !p.slug.includes('/'));

    if (isRootGroup) {
      const folderChildren: PageTree.Node[] = [];
      for (const page of group.pages) {
        const url = slugToUrl(page.slug);
        const idx = children.findIndex(
          (c, i) => !consumed.has(i) && c.type === 'page' && c.url === url
        );
        if (idx >= 0) {
          const node = children[idx];
          if (node) {
            folderChildren.push(node);
          }
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
        const idx = children.findIndex(
          (child, i) =>
            !consumed.has(i) &&
            child.type === 'folder' &&
            child.children?.some((c) => c.type === 'page' && c.url?.startsWith(`/${dirPrefix}/`))
        );
        if (idx >= 0) {
          consumed.add(idx);
          newChildren.push({
            ...(children[idx] as PageTree.Folder),
            name: group.group,
            defaultOpen: !group.collapsed,
          });
        }
      }
    }
  }

  for (let i = 0; i < children.length; i++) {
    if (!consumed.has(i)) {
      const node = children[i];
      if (node) {
        newChildren.push(node);
      }
    }
  }

  return { ...tree, children: newChildren };
}
