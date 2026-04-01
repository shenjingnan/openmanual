import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../core/config/loader.js';
import { OpenManualConfigSchema } from '../core/config/schema.js';
import { getContentTree, scanContentDir } from '../core/content/scanner.js';
import { buildPageTree } from '../core/content/tree.js';

describe('OpenManualConfigSchema', () => {
  it('should validate a minimal valid config', () => {
    const result = OpenManualConfigSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });

  it('should reject config without name', () => {
    const result = OpenManualConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = OpenManualConfigSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept full config', () => {
    const config = {
      name: 'MyProject',
      description: 'A test project',
      contentDir: 'docs',
      outputDir: 'out',
      siteUrl: 'https://example.com',
      locale: 'en',
      navbar: {
        logo: 'MyProject',
        github: 'https://github.com/test/test',
        links: [{ label: 'Blog', href: 'https://blog.example.com' }],
      },
      footer: { text: 'MIT 2025' },
      sidebar: [
        {
          group: 'Getting Started',
          pages: [
            { slug: 'index', title: 'Home' },
            { slug: 'guide', title: 'Guide' },
          ],
        },
      ],
      theme: { primaryHue: 220, darkMode: true },
      search: { enabled: true },
      mdx: { latex: true },
    };
    const result = OpenManualConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject invalid github url', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      navbar: { github: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject primaryHue out of range', () => {
    const result = OpenManualConfigSchema.safeParse({
      name: 'Test',
      theme: { primaryHue: 400 },
    });
    expect(result.success).toBe(false);
  });
});

describe('loadConfig', () => {
  const tmpDir = join(process.cwd(), '.test-tmp');

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should throw when openmanual.json not found', async () => {
    await expect(loadConfig(tmpDir)).rejects.toThrow('not found');
  });

  it('should throw when invalid JSON', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), 'invalid');
    await expect(loadConfig(tmpDir)).rejects.toThrow('not valid JSON');
  });

  it('should load and merge defaults', async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, 'openmanual.json'), JSON.stringify({ name: 'TestProject' }));
    const config = await loadConfig(tmpDir);
    expect(config.name).toBe('TestProject');
    expect(config.contentDir).toBe('content');
    expect(config.outputDir).toBe('dist');
    expect(config.locale).toBe('zh');
    expect(config.navbar?.logo).toBe('TestProject');
    expect(config.theme?.primaryHue).toBe(220);
    expect(config.search?.enabled).toBe(true);
  });
});

describe('content scanner', () => {
  const contentTmpDir = join(process.cwd(), '.test-content-tmp');

  beforeEach(async () => {
    await mkdir(join(contentTmpDir, 'guide'), { recursive: true });
    await writeFile(join(contentTmpDir, 'index.mdx'), '---\ntitle: Home\n---\n# Home');
    await writeFile(
      join(contentTmpDir, 'getting-started.md'),
      '---\ntitle: Getting Started\n---\n# Getting Started'
    );
    await writeFile(
      join(contentTmpDir, 'guide', 'api.mdx'),
      '---\ntitle: API\n---\n# API Reference'
    );
  });

  afterEach(async () => {
    await rm(contentTmpDir, { recursive: true, force: true });
  });

  it('should scan all md/mdx files', async () => {
    const files = await scanContentDir(contentTmpDir);
    expect(files).toHaveLength(3);
  });

  it('should parse frontmatter', async () => {
    const files = await scanContentDir(contentTmpDir);
    const indexFile = files.find((f) => f.slug === 'index');
    expect(indexFile).toBeDefined();
    expect(indexFile?.frontmatter.title).toBe('Home');
  });

  it('should generate correct slugs', async () => {
    const files = await scanContentDir(contentTmpDir);
    const slugs = files.map((f) => f.slug);
    expect(slugs).toContain('index');
    expect(slugs).toContain('getting-started');
    expect(slugs).toContain('guide/api');
  });

  it('should build content tree', async () => {
    const files = await scanContentDir(contentTmpDir);
    const tree = getContentTree(files);
    expect(tree.files).toHaveLength(2); // index.mdx and getting-started.md
    expect(tree.children).toHaveLength(1); // guide/
    expect(tree.children[0]?.files).toHaveLength(1); // api.mdx
  });
});

describe('page tree builder', () => {
  it('should build from sidebar config', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
      {
        filePath: '/test/guide/api.mdx',
        slug: 'guide/api',
        name: 'api',
        frontmatter: { title: 'API' },
        content: '',
        segments: ['guide', 'api'],
      },
    ];

    const sidebar = [
      {
        group: 'Getting Started',
        pages: [{ slug: 'index', title: 'Home' }],
      },
    ];

    const tree = buildPageTree(files, sidebar);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe('folder');
    expect(tree[0]?.name).toBe('Getting Started');
    expect(tree[0]?.children).toHaveLength(1);
  });

  it('should auto-build from file system when no sidebar', () => {
    const files = [
      {
        filePath: '/test/index.mdx',
        slug: 'index',
        name: 'index',
        frontmatter: { title: 'Home' },
        content: '',
        segments: ['index'],
      },
    ];

    const tree = buildPageTree(files);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe('page');
    expect(tree[0]?.name).toBe('Home');
  });
});
