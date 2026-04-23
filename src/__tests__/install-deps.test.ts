import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installDeps } from '../utils/install-deps.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('installDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('当 node_modules 已存在时应跳过安装', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await installDeps('/tmp/app');
    const { spawn } = await import('node:child_process');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('当 pnpm 安装成功时应正常解析', async () => {
    const { existsSync } = await import('node:fs');
    const { spawn } = await import('node:child_process');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const child = new EventEmitter();
    (child as { stderr?: EventEmitter }).stderr = new EventEmitter();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(child);

    const promise = installDeps('/tmp/app');
    child.emit('exit', 0);
    await expect(promise).resolves.toBeUndefined();
  });

  it('当 pnpm 安装以非零退出码结束时应拒绝', async () => {
    const { existsSync } = await import('node:fs');
    const { spawn } = await import('node:child_process');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const child = new EventEmitter();
    const stderr = new EventEmitter();
    (child as { stderr?: EventEmitter }).stderr = stderr;
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(child);

    const promise = installDeps('/tmp/app');
    stderr.emit('data', Buffer.from('error message'));
    child.emit('exit', 1);
    await expect(promise).rejects.toThrow('pnpm install failed');
  });

  it('当 spawn 触发 error 事件时应拒绝', async () => {
    const { existsSync } = await import('node:fs');
    const { spawn } = await import('node:child_process');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const child = new EventEmitter();
    (child as { stderr?: EventEmitter }).stderr = new EventEmitter();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(child);

    const promise = installDeps('/tmp/app');
    child.emit('error', new Error('spawn error'));
    await expect(promise).rejects.toThrow('spawn error');
  });
});
