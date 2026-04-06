import { readdir, readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue(''),
}));

vi.mock('shiki', () => ({
  bundledLanguages: {
    javascript: {},
    typescript: {},
    python: {},
    rust: {},
  },
}));

describe('checkCodeLangs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when all languages are supported', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'test.md', isDirectory: () => false, isFile: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '```javascript\nconsole.log("hi");\n```'
    );

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
  });

  it('should detect unsupported languages', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'test.md', isDirectory: () => false, isFile: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue('```foobar\ncode\n```');

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toHaveLength(1);
    expect(results[0]?.lang).toBe('foobar');
  });

  it('should return correct relative file path and line number', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
      if (dir === '/content')
        return Promise.resolve([{ name: 'guide', isDirectory: () => true, isFile: () => false }]);
      if (dir === '/content/guide')
        return Promise.resolve([
          { name: 'intro.md', isDirectory: () => false, isFile: () => true },
        ]);
      return Promise.resolve([]);
    });
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue('# Title\n\n```unknown\ncode\n```');

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toHaveLength(1);
    expect(results[0]?.file).toBe('guide/intro.md');
    expect(results[0]?.line).toBe(3);
  });

  it('should not report whitelisted plain text languages', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'test.md', isDirectory: () => false, isFile: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '```text\ncode\n```\n```txt\ncode\n```\n```plaintext\ncode\n```\n```plain\ncode\n```\n```ansi\ncode\n```'
    );

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
  });

  it('should recursively collect files from subdirectories', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
      if (dir === '/content')
        return Promise.resolve([
          { name: 'index.md', isDirectory: () => false, isFile: () => true },
          { name: 'sub', isDirectory: () => true, isFile: () => false },
        ]);
      if (dir === '/content/sub')
        return Promise.resolve([
          { name: 'page.mdx', isDirectory: () => false, isFile: () => true },
        ]);
      return Promise.resolve([]);
    });
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue('');

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it('should skip non-markdown files', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'image.png', isDirectory: () => false, isFile: () => true },
      { name: 'data.json', isDirectory: () => false, isFile: () => true },
    ]);

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('should handle multiple files with multiple code blocks', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'a.md', isDirectory: () => false, isFile: () => true },
      { name: 'b.md', isDirectory: () => false, isFile: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (p.endsWith('a.md'))
        return Promise.resolve(
          '```badlang1\ncode\n```\n```javascript\ncode\n```\n```badlang2\ncode\n```'
        );
      return Promise.resolve('```anotherbad\ncode\n```');
    });

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.lang)).toEqual(['badlang1', 'badlang2', 'anotherbad']);
  });

  it('should not be affected by empty lines and inline code', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: 'test.md', isDirectory: () => false, isFile: () => true },
    ]);
    (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '\n\nSome `inline code` here\n\n  \n```typescript\ncode\n```\n'
    );

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
  });

  it('should return empty array for empty directory', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { checkCodeLangs } = await import('../utils/check-code-langs.js');
    const results = await checkCodeLangs('/content');
    expect(results).toEqual([]);
  });
});
