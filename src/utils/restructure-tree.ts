import type * as PageTree from 'fumadocs-core/page-tree';

export interface SidebarConfigEntry {
  group: string;
  icon?: string;
  collapsed?: boolean;
  pages: readonly { slug: string; icon?: string }[];
}

export interface RestructureOptions {
  /** 是否保留树节点原始名称（不覆盖为 sidebar 配置值）。i18n 模式下应设为 true */
  preserveNames?: boolean;
}

export function slugToUrl(slug: string): string {
  return slug === 'index' ? '/' : `/${slug}`;
}

export function restructureTree(
  tree: PageTree.Root,
  sidebarConfig: readonly SidebarConfigEntry[],
  iconMap?: Record<string, React.ReactNode>,
  options?: RestructureOptions
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
            folderChildren.push(
              page.icon && iconMap?.[page.icon] ? { ...node, icon: iconMap[page.icon] } : node
            );
          }
          consumed.add(idx);
        }
      }
      if (folderChildren.length > 0) {
        newChildren.push({
          type: 'folder',
          name: group.group,
          icon: group.icon && iconMap ? iconMap[group.icon] : undefined,
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
          const originalFolder = children[idx] as PageTree.Folder;

          // Inject icons into children pages
          const childrenWithIcons = (originalFolder.children ?? []).map((child) => {
            if (child.type === 'page') {
              const matchedPage = group.pages.find((p) => {
                const url = slugToUrl(p.slug);
                return child.url === url;
              });
              if (matchedPage?.icon && iconMap?.[matchedPage.icon]) {
                return { ...child, icon: iconMap[matchedPage.icon] };
              }
            }
            return child;
          });

          newChildren.push({
            ...originalFolder,
            ...(options?.preserveNames ? {} : { name: group.group }),
            icon: group.icon && iconMap ? iconMap[group.icon] : undefined,
            defaultOpen: !group.collapsed,
            children: childrenWithIcons,
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
