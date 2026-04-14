import { existsSync } from 'node:fs';
import { lstat, mkdir, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const TEMP_DIR_NAME = '.cache';

export function getTempDir(cwd: string): string {
  return join(cwd, TEMP_DIR_NAME);
}

export function getAppDir(cwd: string): string {
  return join(getTempDir(cwd), 'app');
}

export async function ensureTempDir(cwd: string): Promise<string> {
  const tempDir = getTempDir(cwd);
  const appDir = getAppDir(cwd);

  // 清理残留文件（防止 dev 模式的文件在 build 时残留导致报错）
  await cleanTempDir(cwd);

  await mkdir(tempDir, { recursive: true });
  await mkdir(join(appDir, 'app'), { recursive: true });

  return tempDir;
}

export async function cleanTempDir(cwd: string): Promise<void> {
  const tempDir = getTempDir(cwd);
  if (existsSync(tempDir)) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  const resolvedTarget = resolve(target);
  const resolvedLink = resolve(linkPath);

  try {
    await lstat(resolvedLink);
    // Remove existing symlink or directory
    await rm(resolvedLink, { recursive: true, force: true });
  } catch {
    // link doesn't exist, that's fine
  }

  await symlink(resolvedTarget, resolvedLink, 'junction');
}
