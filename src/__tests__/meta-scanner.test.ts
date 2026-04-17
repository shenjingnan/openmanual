import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectSlugsFromMeta, scanMetaFiles } from '../core/content/meta-scanner.js';

const TMP_DIR = join(process.env.TMPDIR ?? '/tmp', 'openmanual-test-meta-scanner');

describe('meta-scanner', () => {
  beforeEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
    await mkdir(TMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  describe('scanMetaFiles - dir-parser mode', () => {
    const languages = ['zh', 'en'];
    const useDirParser = true;

    it('should scan directory-level meta.json files', async () => {
      // Setup: content/zh/guide/meta.json
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({
          title: '指南',
          icon: 'BookOpen',
          defaultOpen: true,
          pages: ['configuration', 'writing-docs'],
        })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dirPath).toBe('zh/guide');
      expect(groups[0]?.isRoot).toBe(false);
      expect(groups[0]?.title).toBe('指南');
      expect(groups[0]?.icon).toBe('BookOpen');
      expect(groups[0]?.defaultOpen).toBe(true);
      expect(groups[0]?.pages).toEqual(['configuration', 'writing-docs']);
    });

    it('should identify root-level meta.json (directly under language dir)', async () => {
      // Setup: content/zh/meta.json
      await mkdir(join(TMP_DIR, 'zh'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'meta.json'),
        JSON.stringify({ title: '开始', pages: ['index', 'quickstart'] })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dirPath).toBe('zh');
      expect(groups[0]?.isRoot).toBe(true);
      expect(groups[0]?.title).toBe('开始');
    });

    it('should scan multiple languages independently', async () => {
      // Chinese
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: '指南', pages: ['configuration'] })
      );
      // English
      await mkdir(join(TMP_DIR, 'en', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'en', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide', pages: ['configuration'] })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(2);
      const zhGroup = groups.find((g) => g.dirPath === 'zh/guide');
      const enGroup = groups.find((g) => g.dirPath === 'en/guide');
      expect(zhGroup?.title).toBe('指南');
      expect(enGroup?.title).toBe('Guide');
    });

    it('should return empty array for empty content directory', async () => {
      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(0);
    });

    it('should skip meta.json without valid title', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(join(TMP_DIR, 'zh', 'guide', 'meta.json'), JSON.stringify({}));

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(0);
    });

    it('should handle missing optional fields gracefully', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide' })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.icon).toBeUndefined();
      expect(groups[0]?.defaultOpen).toBeUndefined();
      expect(groups[0]?.pages).toBeUndefined();
    });

    it('should skip invalid JSON files silently', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(join(TMP_DIR, 'zh', 'guide', 'meta.json'), 'not-json{{{');

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(0);
    });

    it('should filter non-string entries from pages array', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide', pages: ['valid', 123, null, 'also-valid', {}] })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups[0]?.pages).toEqual(['valid', 'also-valid']);
    });

    it('should parse root: true from meta.json', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide', root: true })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.root).toBe(true);
    });

    it('should parse root: false from meta.json', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide', root: false })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.root).toBe(false);
    });

    it('should default root to undefined when not set', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide' })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.root).toBeUndefined();
    });

    it('should ignore non-boolean root value', async () => {
      await mkdir(join(TMP_DIR, 'zh', 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'zh', 'guide', 'meta.json'),
        JSON.stringify({ title: 'Guide', root: 'yes' })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.root).toBeUndefined();
    });
  });

  describe('scanMetaFiles - dot-parser mode (single language)', () => {
    const languages = ['zh'];
    const useDirParser = false;

    it('should scan meta.json at directory level', async () => {
      await mkdir(join(TMP_DIR, 'guide'), { recursive: true });
      await writeFile(
        join(TMP_DIR, 'guide', 'meta.json'),
        JSON.stringify({ title: '指南', pages: ['configuration'] })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dirPath).toBe('guide');
      expect(groups[0]?.isRoot).toBe(false);
      expect(groups[0]?.title).toBe('指南');
    });

    it('should identify root-level meta.json in dot-parser mode', async () => {
      await writeFile(
        join(TMP_DIR, 'meta.json'),
        JSON.stringify({ title: '开始', pages: ['index', 'quickstart'] })
      );

      const groups = await scanMetaFiles(TMP_DIR, languages, useDirParser);

      expect(groups).toHaveLength(1);
      expect(groups[0]?.dirPath).toBe('');
      expect(groups[0]?.isRoot).toBe(true);
    });

    it('should skip locale-suffixed meta files in multi-language dot-parser', async () => {
      const multiLang = ['zh', 'en'];
      await mkdir(join(TMP_DIR, 'guide'), { recursive: true });
      await writeFile(join(TMP_DIR, 'guide', 'meta.json'), JSON.stringify({ title: 'Guide' }));
      await writeFile(
        join(TMP_DIR, 'guide', 'meta.en.json'),
        JSON.stringify({ title: 'Guide EN' })
      );

      const groups = await scanMetaFiles(TMP_DIR, multiLang, false);

      // Should only return the base meta.json, not the locale-suffixed one
      expect(groups).toHaveLength(1);
      expect(groups[0]?.title).toBe('Guide');
    });
  });

  describe('collectSlugsFromMeta', () => {
    it('should collect slugs from root-level groups directly', () => {
      const groups: MetaGroupInfo[] = [
        {
          filePath: '/tmp/zh/meta.json',
          dirPath: 'zh',
          isRoot: true,
          title: '开始',
          pages: ['index', 'quickstart'],
        },
      ];

      const slugs = collectSlugsFromMeta(groups);
      expect(slugs).toEqual(new Set(['index', 'quickstart']));
    });

    it('should prefix directory path for non-root groups', () => {
      const groups: MetaGroupInfo[] = [
        {
          filePath: '/tmp/zh/guide/meta.json',
          dirPath: 'zh/guide',
          isRoot: false,
          title: '指南',
          pages: ['configuration', 'writing-docs'],
        },
      ];

      const slugs = collectSlugsFromMeta(groups);
      expect(slugs).toEqual(new Set(['zh/guide/configuration', 'zh/guide/writing-docs']));
    });

    it('should handle mixed root and directory groups', () => {
      const groups: MetaGroupInfo[] = [
        {
          filePath: '/tmp/zh/meta.json',
          dirPath: 'zh',
          isRoot: true,
          title: '开始',
          pages: ['index', 'quickstart'],
        },
        {
          filePath: '/tmp/zh/guide/meta.json',
          dirPath: 'zh/guide',
          isRoot: false,
          title: '指南',
          pages: ['configuration'],
        },
        {
          filePath: '/tmp/zh/components/meta.json',
          dirPath: 'zh/components',
          isRoot: false,
          title: '组件',
          pages: ['callout', 'card'],
        },
      ];

      const slugs = collectSlugsFromMeta(groups);
      expect(slugs).toContain('index');
      expect(slugs).toContain('quickstart');
      expect(slugs).toContain('zh/guide/configuration');
      expect(slugs).toContain('zh/components/callout');
      expect(slugs).toContain('zh/components/card');
      expect(slugs.size).toBe(5);
    });

    it('should return empty set for groups without pages', () => {
      const groups: MetaGroupInfo[] = [
        {
          filePath: '/tmp/zh/guide/meta.json',
          dirPath: 'zh/guide',
          isRoot: false,
          title: '指南',
        },
      ];

      const slugs = collectSlugsFromMeta(groups);
      expect(slugs.size).toBe(0);
    });

    it('should return empty set for empty input', () => {
      const slugs = collectSlugsFromMeta([]);
      expect(slugs.size).toBe(0);
    });
  });
});

// Re-declare interface for test usage (matches the imported one)
interface MetaGroupInfo {
  filePath: string;
  dirPath: string;
  isRoot: boolean;
  root?: boolean;
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  pages?: string[];
}
