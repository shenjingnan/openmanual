import type { SidebarGroup } from '../config/schema.js';
import type { ContentFile } from './scanner.js';

/**
 * Build Fumadocs-compatible page tree from sidebar config.
 * When sidebar is configured, use it to define structure.
 * When sidebar is not configured, auto-generate from file system.
 */
export function buildPageTree(files: ContentFile[], sidebar?: SidebarGroup[]): PageTreeItem[] {
  if (sidebar && sidebar.length > 0) {
    return buildFromConfig(sidebar, files);
  }
  return buildFromFileSystem(files);
}

interface PageTreeItem {
  type: 'page' | 'folder';
  name: string;
  slug?: string;
  icon?: string | undefined;
  children?: PageTreeItem[];
  index?: boolean;
}

function buildFromConfig(sidebar: SidebarGroup[], files: ContentFile[]): PageTreeItem[] {
  const fileMap = new Map(files.map((f) => [f.slug, f]));
  const items: PageTreeItem[] = [];

  for (const group of sidebar) {
    const folderItem: PageTreeItem = {
      type: 'folder',
      name: group.group,
      ...(group.icon ? { icon: group.icon } : {}),
      children: [],
    };

    for (const page of group.pages) {
      const file = fileMap.get(page.slug);
      const title = page.title || (file?.frontmatter.title as string) || page.slug;
      folderItem.children?.push({
        type: 'page',
        name: title,
        slug: page.slug,
        ...(page.icon ? { icon: page.icon } : {}),
      });
    }

    items.push(folderItem);
  }

  return items;
}

function buildFromFileSystem(files: ContentFile[]): PageTreeItem[] {
  const tree = buildDirectoryTree(files);
  return convertDirectoryToTree(tree);
}

interface DirNode {
  name: string;
  files: ContentFile[];
  children: Map<string, DirNode>;
}

function buildDirectoryTree(files: ContentFile[]): DirNode {
  const root: DirNode = { name: '', files: [], children: new Map() };

  for (const file of files) {
    let current = root;

    for (const segment of file.segments.slice(0, -1)) {
      let child = current.children.get(segment);
      if (!child) {
        child = { name: segment, files: [], children: new Map() };
        current.children.set(segment, child);
      }
      current = child;
    }

    current.files.push(file);
  }

  return root;
}

function convertDirectoryToTree(dir: DirNode): PageTreeItem[] {
  const items: PageTreeItem[] = [];

  for (const file of dir.files) {
    const title = (file.frontmatter.title as string) ?? formatTitle(file.name);
    items.push({
      type: 'page',
      name: title,
      slug: file.slug,
    });
  }

  for (const [, child] of dir.children) {
    const folderItem: PageTreeItem = {
      type: 'folder',
      name: formatTitle(child.name),
      children: convertDirectoryToTree(child),
    };

    const indexFile = child.files.find((f) => f.name === 'index' || f.slug.endsWith('/index'));
    if (indexFile) {
      folderItem.slug = indexFile.slug.replace(/\/index$/, '') || 'index';
      folderItem.index = true;
    }

    items.push(folderItem);
  }

  return items;
}

function formatTitle(name: string): string {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generate Fumadocs source.config.ts content string
 * that defines docs from a content directory.
 */
export function generateSourceConfigContent(contentDir: string): string {
  return `import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: '${contentDir}',
});

export default defineConfig();`;
}
