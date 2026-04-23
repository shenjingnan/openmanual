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

  it('应当递归创建目标目录', async () => {
    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');
    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
  });

  it('应当复制 .md 文件并保留 .md 扩展名', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['readme.md']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/readme.md', '/dest/readme.md');
  });

  it('应当复制 .mdx 文件并重命名为 .md', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['guide.mdx']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/guide.mdx', '/dest/guide.md');
  });

  it('应当跳过非 Markdown 文件', async () => {
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

  it('应当递归处理子目录', async () => {
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

  it('应当处理大写扩展名（.MDX、.MD）', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(['README.MD', 'GUIDE.MDX']);
    (stat as ReturnType<typeof vi.fn>).mockResolvedValue({ isDirectory: () => false });

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).toHaveBeenCalledWith('/src/README.MD', '/dest/README.md');
    expect(copyFile).toHaveBeenCalledWith('/src/GUIDE.MDX', '/dest/GUIDE.md');
  });

  it('应当处理空的源目录', async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { copyRawMarkdown } = await import('../utils/copy-raw-markdown.js');
    await copyRawMarkdown('/src', '/dest');

    expect(copyFile).not.toHaveBeenCalled();
    expect(mkdir).toHaveBeenCalledWith('/dest', { recursive: true });
  });

  it('应当处理混合的文件和目录', async () => {
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
