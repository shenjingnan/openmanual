import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanTempDir,
  createSymlink,
  ensureTempDir,
  getAppDir,
  getTempDir,
} from '../utils/temp-dir.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  symlink: vi.fn().mockResolvedValue(undefined),
  lstat: vi.fn().mockRejectedValue(new Error('not found')),
}));

describe('getTempDir', () => {
  it('应当返回 cwd 下的 .cache 目录', () => {
    const result = getTempDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache');
  });
});

describe('getAppDir', () => {
  it('应当返回临时目录下的 app 目录', () => {
    const result = getAppDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache/app');
  });
});

describe('ensureTempDir', () => {
  it('应当先清理已有目录再创建临时目录和 app/app 目录', async () => {
    const { existsSync } = await import('node:fs');
    const { mkdir, rm } = await import('node:fs/promises');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await ensureTempDir('/tmp/project');

    // 先清理残留
    expect(rm).toHaveBeenCalledWith('/tmp/project/.cache', {
      recursive: true,
      force: true,
    });
    // 再创建目录
    expect(mkdir).toHaveBeenCalledWith('/tmp/project/.cache', { recursive: true });
    expect(mkdir).toHaveBeenCalledWith('/tmp/project/.cache/app/app', { recursive: true });
  });

  it('应当返回临时目录路径', async () => {
    const result = await ensureTempDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache');
  });
});

describe('cleanTempDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('当目录存在时应删除该目录', async () => {
    const { existsSync } = await import('node:fs');
    const { rm } = await import('node:fs/promises');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await cleanTempDir('/tmp/project');
    expect(rm).toHaveBeenCalledWith('/tmp/project/.cache', {
      recursive: true,
      force: true,
    });
  });

  it('当目录不存在时应跳过删除', async () => {
    const { existsSync } = await import('node:fs');
    const { rm } = await import('node:fs/promises');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    await cleanTempDir('/tmp/project');
    expect(rm).not.toHaveBeenCalled();
  });
});

describe('createSymlink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('当符号链接不存在时应创建符号链接', async () => {
    const { symlink } = await import('node:fs/promises');
    await createSymlink('/target', '/link');
    expect(symlink).toHaveBeenCalledWith('/target', '/link', 'junction');
  });

  it('应当先删除已有链接再创建新链接', async () => {
    const { lstat, rm, symlink } = await import('node:fs/promises');
    (lstat as ReturnType<typeof vi.fn>).mockResolvedValue({ isFile: () => false });

    await createSymlink('/target', '/link');
    expect(rm).toHaveBeenCalledWith('/link', { recursive: true, force: true });
    expect(symlink).toHaveBeenCalledWith('/target', '/link', 'junction');
  });

  it('应当使用 junction 类型创建符号链接', async () => {
    const { symlink } = await import('node:fs/promises');
    await createSymlink('/target/path', '/link/path');
    expect(symlink).toHaveBeenCalledWith('/target/path', '/link/path', 'junction');
  });
});
