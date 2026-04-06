import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
  copyFile: vi.fn().mockResolvedValue(undefined),
}));

describe('copyRawMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create target directory recursively', async () => {
    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');
    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
  });

  it('should copy .md files keeping .md extension', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['readme.md']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/readme.md', '/dest/readme.md');
  });

  it('should copy .mdx files and rename to .md', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['guide.mdx']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/guide.mdx', '/dest/guide.md');
  });

  it('should skip non-markdown files', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([
      'image.png',
      'data.json',
      'style.css',
    ]);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).not.toHaveBeenCalled();
  });

  it('should recursively process subdirectories', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
      if (dir === '/src') return Promise.resolve(['guide']);
      if (dir === '/src/guide') return Promise.resolve(['intro.md']);
      return Promise.resolve([]);
    });
    (stat as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (p === '/src/guide') return Promise.resolve({ isDirectory: () => true });
      return Promise.resolve({ isDirectory: () => false });
    });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
    expect(mkdir).toHaveBeenCalledWith('/dest/guide', { recursive: true });
    expect(copyFile).toHaveBeenCalledWith('/src/guide/intro.md', '/dest/guide/intro.md');
  });

  it('should handle uppercase extensions (.MDX, .MD)', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['README.MD', 'GUIDE.MDX']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/README.MD', '/dest/README.md');
    expect(copyFile).toHaveBeenCalledWith('/src/GUIDE.MDX', '/dest/GUIDE.md');
  });

  it('should handle empty source directory', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).not.toHaveBeenCalled();
    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
  });

  it('should handle mixed files and directories', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
      if (dir === '/src') return Promise.resolve(['index.md', 'sub', 'image.png']);
      if (dir === '/src/sub') return Promise.resolve(['detail.mdx']);
      return Promise.resolve([]);
    });
    (stat as ReturnType<typeof vi.fn>).mockImplementation((p: string) => {
      if (p === '/src/sub') return Promise.resolve({ isDirectory: () => true });
      return Promise.resolve({ isDirectory: () => false });
    });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledTimes(2);
    expect(copyFile).toHaveBeenCalledWith('/src/index.md', '/dest/index.md');
    expect(copyFile).toHaveBeenCalledWith('/src/sub/detail.mdx', '/dest/sub/detail.md');
  });
});
