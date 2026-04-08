import type * as PageTree from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';
import type { SidebarConfigEntry } from '../utils/restructure-tree.js';
import { restructureTree, slugToUrl } from '../utils/restructure-tree.js';

describe('slugToUrl', () => {
  it('should convert index to root path', () => {
    expect(slugToUrl('index')).toBe('/');
  });

  it('should convert slug to URL path', () => {
    expect(slugToUrl('guide')).toBe('/guide');
  });

  it('should convert nested slug to URL path', () => {
    expect(slugToUrl('guide/api')).toBe('/guide/api');
  });
});

describe('restructureTree', () => {
  function makePage(url: string, name: string = url): PageTree.Item {
    return { type: 'page', url, name };
  }

  function makeFolder(
    name: string,
    children: PageTree.Node[],
    options?: Partial<PageTree.Folder>
  ): PageTree.Folder {
    return { type: 'folder', name, children, ...options };
  }

  function makeRoot(children: PageTree.Node[]): PageTree.Root {
    return { name: 'Root', children };
  }

  describe('root-level grouping', () => {
    it('should wrap root-level pages into a folder', () => {
      const tree = makeRoot([
        makePage('/', 'Home'),
        makePage('/quickstart', 'Quick Start'),
        makePage('/other', 'Other'),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          collapsed: false,
          pages: [{ slug: 'index' }, { slug: 'quickstart' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      expect(result.children).toHaveLength(2);

      const folder = result.children[0] as PageTree.Folder;
      expect(folder.type).toBe('folder');
      expect(folder.name).toBe('Getting Started');
      expect(folder.defaultOpen).toBe(true);
      expect(folder.children).toHaveLength(2);
      expect((folder.children[0] as PageTree.Item).url).toBe('/');
      expect((folder.children[1] as PageTree.Item).url).toBe('/quickstart');

      // Unconsumed node preserved
      const other = result.children[1] as PageTree.Item;
      expect(other.type).toBe('page');
      expect(other.url).toBe('/other');
    });

    it('should set defaultOpen to false when collapsed is true', () => {
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Collapsed Group',
          collapsed: true,
          pages: [{ slug: 'index' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.defaultOpen).toBe(false);
    });

    it('should set defaultOpen to true when collapsed is undefined', () => {
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Open Group',
          pages: [{ slug: 'index' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.defaultOpen).toBe(true);
    });
  });

  describe('directory-level grouping', () => {
    it('should rename existing folder to match group name', () => {
      const tree = makeRoot([
        makeFolder('Guide', [makePage('/guide/intro', 'Intro'), makePage('/guide/api', 'API')]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          collapsed: false,
          pages: [{ slug: 'guide/intro' }, { slug: 'guide/api' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      expect(result.children).toHaveLength(1);

      const folder = result.children[0] as PageTree.Folder;
      expect(folder.type).toBe('folder');
      expect(folder.name).toBe('指南');
      expect(folder.defaultOpen).toBe(true);
      expect(folder.children).toHaveLength(2);
    });

    it('should collapse directory-level groups', () => {
      const tree = makeRoot([makeFolder('Advanced', [makePage('/advanced/search', 'Search')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '进阶',
          collapsed: true,
          pages: [{ slug: 'advanced/search' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.name).toBe('进阶');
      expect(folder.defaultOpen).toBe(false);
    });
  });

  describe('unconsumed nodes', () => {
    it('should preserve nodes not in sidebar config', () => {
      const tree = makeRoot([
        makePage('/', 'Home'),
        makePage('/orphan', 'Orphan Page'),
        makeFolder('Extra', [makePage('/extra/page', 'Extra')]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Main',
          pages: [{ slug: 'index' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      expect(result.children).toHaveLength(3);

      // First child is the grouped folder
      expect((result.children[0] as PageTree.Folder).name).toBe('Main');
      // Remaining children preserved in original order
      expect((result.children[1] as PageTree.Item).url).toBe('/orphan');
      expect((result.children[2] as PageTree.Folder).name).toBe('Extra');
    });
  });

  describe('empty sidebar config', () => {
    it('should return tree unchanged when sidebar config is empty', () => {
      const tree = makeRoot([makePage('/', 'Home'), makePage('/guide', 'Guide')]);

      const result = restructureTree(tree, []);
      expect(result.children).toHaveLength(2);
      expect((result.children[0] as PageTree.Item).url).toBe('/');
      expect((result.children[1] as PageTree.Item).url).toBe('/guide');
    });
  });

  describe('mixed root and directory groups', () => {
    it('should handle both root and directory groups together', () => {
      const tree = makeRoot([
        makePage('/', 'Home'),
        makePage('/quickstart', 'Quick Start'),
        makeFolder('Guide', [
          makePage('/guide/intro', 'Intro'),
          makePage('/guide/advanced', 'Advanced'),
        ]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '开始',
          pages: [{ slug: 'index' }, { slug: 'quickstart' }],
        },
        {
          group: '指南',
          pages: [{ slug: 'guide/intro' }, { slug: 'guide/advanced' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      expect(result.children).toHaveLength(2);

      const rootGroup = result.children[0] as PageTree.Folder;
      expect(rootGroup.name).toBe('开始');
      expect(rootGroup.children).toHaveLength(2);

      const dirGroup = result.children[1] as PageTree.Folder;
      expect(dirGroup.name).toBe('指南');
      expect(dirGroup.children).toHaveLength(2);
    });
  });

  describe('missing pages', () => {
    it('should skip pages not found in tree', () => {
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Missing',
          pages: [{ slug: 'nonexistent' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      // Folder should not be created when no pages match
      expect(result.children).toHaveLength(1);
      expect(result.children[0]?.type).toBe('page');
    });
  });
});
