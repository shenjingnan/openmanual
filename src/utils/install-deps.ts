import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export async function installDeps(appDir: string): Promise<void> {
  const nodeModules = resolve(appDir, 'node_modules');

  // Skip install if node_modules already exists
  if (existsSync(nodeModules)) {
    return;
  }

  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd: appDir,
      stdio: 'pipe',
      env: { ...process.env },
    });

    let stderr = '';
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pnpm install failed: ${stderr}`));
      }
    });
  });
}
