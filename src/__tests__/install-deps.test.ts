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

  it('should skip install when node_modules exists', async () => {
    const { existsSync } = await import('node:fs');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    await installDeps('/tmp/app');
    const { spawn } = await import('node:child_process');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should resolve when ppm install succeeds', async () => {
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

  it('should reject when pnpm install exits with non-zero code', async () => {
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

  it('should reject when spawn emits error event', async () => {
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
