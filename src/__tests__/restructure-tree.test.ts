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

  describe('icon injection', () => {
    it('should inject page icon into root-level folder children', () => {
      const iconMap = { HomeIcon: 'home-icon-element' };
      const tree = makeRoot([makePage('/', 'Home'), makePage('/quickstart', 'Quick Start')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          pages: [{ slug: 'index', icon: 'HomeIcon' }, { slug: 'quickstart' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.children).toHaveLength(2);

      const homePage = folder.children[0] as PageTree.Item;
      expect(homePage.icon).toBe('home-icon-element');

      const quickstartPage = folder.children[1] as PageTree.Item;
      expect(quickstartPage.icon).toBeUndefined();
    });

    it('should inject group icon into root-level folder', () => {
      const iconMap = { FolderIcon: 'folder-icon-element' };
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          icon: 'FolderIcon',
          pages: [{ slug: 'index' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.icon).toBe('folder-icon-element');
    });

    it('should not inject icon when iconMap has no matching key', () => {
      const iconMap = { OtherIcon: 'other-element' };
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          icon: 'MissingIcon',
          pages: [{ slug: 'index', icon: 'MissingPageIcon' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.icon).toBeUndefined();

      const homePage = folder.children[0] as PageTree.Item;
      expect(homePage.icon).toBeUndefined();
    });

    it('should inject page icon into directory-level children', () => {
      const iconMap = { IntroIcon: 'intro-icon-element' };
      const tree = makeRoot([
        makeFolder('Guide', [makePage('/guide/intro', 'Intro'), makePage('/guide/api', 'API')]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          pages: [{ slug: 'guide/intro', icon: 'IntroIcon' }, { slug: 'guide/api' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;

      const introPage = folder.children.find(
        (c) => c.type === 'page' && c.url === '/guide/intro'
      ) as PageTree.Item;
      expect(introPage.icon).toBe('intro-icon-element');

      const apiPage = folder.children.find(
        (c) => c.type === 'page' && c.url === '/guide/api'
      ) as PageTree.Item;
      expect(apiPage.icon).toBeUndefined();
    });

    it('should inject group icon into directory-level folder', () => {
      const iconMap = { GuideIcon: 'guide-icon-element' };
      const tree = makeRoot([makeFolder('Guide', [makePage('/guide/intro', 'Intro')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          icon: 'GuideIcon',
          pages: [{ slug: 'guide/intro' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.icon).toBe('guide-icon-element');
    });

    it('should handle mixed icon/non-icon pages in directory-level folder', () => {
      const iconMap = { IconA: 'icon-a', IconB: 'icon-b' };
      const tree = makeRoot([
        makeFolder('Guide', [
          makePage('/guide/intro', 'Intro'),
          makePage('/guide/api', 'API'),
          makePage('/guide/advanced', 'Advanced'),
        ]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          pages: [
            { slug: 'guide/intro', icon: 'IconA' },
            { slug: 'guide/api' },
            { slug: 'guide/advanced', icon: 'IconB' },
          ],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.children).toHaveLength(3);

      const intro = folder.children.find(
        (c) => c.type === 'page' && c.url === '/guide/intro'
      ) as PageTree.Item;
      expect(intro.icon).toBe('icon-a');

      const api = folder.children.find(
        (c) => c.type === 'page' && c.url === '/guide/api'
      ) as PageTree.Item;
      expect(api.icon).toBeUndefined();

      const advanced = folder.children.find(
        (c) => c.type === 'page' && c.url === '/guide/advanced'
      ) as PageTree.Item;
      expect(advanced.icon).toBe('icon-b');
    });

    it('should behave identically when iconMap is undefined', () => {
      const tree = makeRoot([makePage('/', 'Home'), makePage('/quickstart', 'Quick Start')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          pages: [{ slug: 'index' }, { slug: 'quickstart' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.icon).toBeUndefined();
      expect(folder.children).toHaveLength(2);
      expect((folder.children[0] as PageTree.Item).icon).toBeUndefined();
    });

    it('should not inject icon when page.icon is set but iconMap is undefined', () => {
      const tree = makeRoot([makePage('/', 'Home')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          icon: 'FolderIcon',
          pages: [{ slug: 'index', icon: 'HomeIcon' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.icon).toBeUndefined();
      expect((folder.children[0] as PageTree.Item).icon).toBeUndefined();
    });
  });

  describe('preserveNames option', () => {
    it('should preserve original folder name when preserveNames is true (directory-level)', () => {
      const tree = makeRoot([
        makeFolder('Guide', [makePage('/guide/intro', 'Intro'), makePage('/guide/api', 'API')]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南（来自配置，应被忽略）',
          collapsed: false,
          pages: [{ slug: 'guide/intro' }, { slug: 'guide/api' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, undefined, { preserveNames: true });
      const folder = result.children[0] as PageTree.Folder;
      // 名称应保持原始树中的 "Guide"，而非 sidebar 配置中的值
      expect(folder.name).toBe('Guide');
    });

    it('should still overwrite folder name when preserveNames is false (default behavior)', () => {
      const tree = makeRoot([makeFolder('Guide', [makePage('/guide/intro', 'Intro')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          pages: [{ slug: 'guide/intro' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.name).toBe('指南');
    });

    it('should still overwrite folder name when preserveNames is undefined (default behavior)', () => {
      const tree = makeRoot([makeFolder('Guide', [makePage('/guide/intro', 'Intro')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          pages: [{ slug: 'guide/intro' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, undefined, undefined);
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.name).toBe('指南');
    });

    it('should use group name as fallback for root-level created folders even with preserveNames', () => {
      const tree = makeRoot([makePage('/', 'Home'), makePage('/quickstart', 'Quick Start')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Getting Started',
          pages: [{ slug: 'index' }, { slug: 'quickstart' }],
        },
      ];

      // 根级页面分组会创建新文件夹，没有原始名称可保留，仍使用 group 值
      const result = restructureTree(tree, sidebarConfig, undefined, { preserveNames: true });
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.name).toBe('Getting Started');
    });

    it('should still inject icons and collapsed state when preserveNames is true', () => {
      const iconMap = { BookIcon: 'book-icon' };
      const tree = makeRoot([makeFolder('Guide', [makePage('/guide/intro', 'Intro')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '配置指南（应被忽略）',
          icon: 'BookIcon',
          collapsed: true,
          pages: [{ slug: 'guide/intro' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, iconMap, { preserveNames: true });
      const folder = result.children[0] as PageTree.Folder;
      expect(folder.name).toBe('Guide'); // 保留原始名称
      expect(folder.icon).toBe('book-icon'); // 图标仍然注入
      expect(folder.defaultOpen).toBe(false); // 折叠状态仍然生效
    });

    it('should handle multiple directory groups with preserveNames', () => {
      const tree = makeRoot([
        makeFolder('Guide', [makePage('/guide/intro', 'Intro')]),
        makeFolder('Components', [makePage('/components/card', 'Card')]),
        makeFolder('Advanced', [makePage('/advanced/search', 'Search')]),
      ]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南配置名',
          icon: 'BookIcon',
          pages: [{ slug: 'guide/intro' }],
        },
        {
          group: '组件配置名',
          pages: [{ slug: 'components/card' }],
        },
        {
          group: '高级配置名',
          pages: [{ slug: 'advanced/search' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig, undefined, { preserveNames: true });
      expect(result.children).toHaveLength(3);

      expect((result.children[0] as PageTree.Folder).name).toBe('Guide');
      expect((result.children[1] as PageTree.Folder).name).toBe('Components');
      expect((result.children[2] as PageTree.Folder).name).toBe('Advanced');
    });
  });

  describe('edge cases - unmatched groups', () => {
    it('should skip directory group when matching folder not found in tree', () => {
      const tree = makeRoot([makeFolder('Components', [makePage('/components/card', 'Card')])]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: '指南',
          pages: [{ slug: 'guide/intro' }, { slug: 'guide/api' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      // 该分组应被跳过（树中没有 guide 目录），原始 Components 文件夹保留
      expect(result.children).toHaveLength(1);
      expect((result.children[0] as PageTree.Folder).name).toBe('Components');
    });

    it('should not create folder when all root-level pages in group do not match', () => {
      const tree = makeRoot([makePage('/', 'Home'), makePage('/about', 'About')]);

      const sidebarConfig: readonly SidebarConfigEntry[] = [
        {
          group: 'Missing Group',
          pages: [{ slug: 'nonexistent1' }, { slug: 'nonexistent2' }],
        },
      ];

      const result = restructureTree(tree, sidebarConfig);
      // 所有页面都不匹配，不应创建 folder，原始页面保留
      expect(result.children).toHaveLength(2);
      expect(result.children[0]?.type).toBe('page');
      expect(result.children[1]?.type).toBe('page');
    });
  });
});
