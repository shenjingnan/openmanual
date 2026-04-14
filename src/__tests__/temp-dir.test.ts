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
  it('should return .cache directory under cwd', () => {
    const result = getTempDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache');
  });
});

describe('getAppDir', () => {
  it('should return app directory under temp dir', () => {
    const result = getAppDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache/app');
  });
});

describe('ensureTempDir', () => {
  it('should clean existing dir then create temp and app/app directories', async () => {
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

  it('should return temp dir path', async () => {
    const result = await ensureTempDir('/tmp/project');
    expect(result).toBe('/tmp/project/.cache');
  });
});

describe('cleanTempDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove directory when it exists', async () => {
    const { existsSync } = await import('node:fs');
    const { rm } = await import('node:fs/promises');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await cleanTempDir('/tmp/project');
    expect(rm).toHaveBeenCalledWith('/tmp/project/.cache', {
      recursive: true,
      force: true,
    });
  });

  it('should skip removal when directory does not exist', async () => {
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

  it('should create symlink when link does not exist', async () => {
    const { symlink } = await import('node:fs/promises');
    await createSymlink('/target', '/link');
    expect(symlink).toHaveBeenCalledWith('/target', '/link', 'junction');
  });

  it('should remove existing link before creating new one', async () => {
    const { lstat, rm, symlink } = await import('node:fs/promises');
    (lstat as ReturnType<typeof vi.fn>).mockResolvedValue({ isFile: () => false });

    await createSymlink('/target', '/link');
    expect(rm).toHaveBeenCalledWith('/link', { recursive: true, force: true });
    expect(symlink).toHaveBeenCalledWith('/target', '/link', 'junction');
  });

  it('should use junction type for symlink', async () => {
    const { symlink } = await import('node:fs/promises');
    await createSymlink('/target/path', '/link/path');
    expect(symlink).toHaveBeenCalledWith('/target/path', '/link/path', 'junction');
  });
});
