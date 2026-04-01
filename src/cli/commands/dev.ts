import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { generateAll } from '../../core/generator/index.js';
import { installDeps } from '../../utils/install-deps.js';
import { logger } from '../../utils/logger.js';
import { createSymlink, ensureTempDir, getAppDir } from '../../utils/temp-dir.js';

export const devCommand = new Command('dev')
  .description('启动开发服务器')
  .option('-p, --port <port>', '端口号', '3000')
  .action(async (options) => {
    const cwd = process.cwd();

    try {
      logger.step('读取配置文件...');
      const config = await loadConfig(cwd);

      logger.step('生成临时应用...');
      const tempDir = await ensureTempDir(cwd);
      const appDir = getAppDir(cwd);
      const contentDir = resolve(cwd, config.contentDir ?? 'content');

      const ctx = {
        config,
        projectDir: cwd,
        appDir,
        contentDir: config.contentDir ?? 'content',
      };

      await generateAll(ctx);

      // Symlink content directory
      await createSymlink(contentDir, resolve(appDir, 'content'));

      // Symlink public directory if exists
      const publicDir = resolve(cwd, 'public');
      try {
        const { stat } = await import('node:fs/promises');
        await stat(publicDir);
        await createSymlink(publicDir, resolve(appDir, 'public'));
      } catch {
        // no public dir, that's fine
      }

      logger.step('安装依赖...');
      await installDeps(appDir);

      logger.success(`开发服务器启动中...`);
      logger.info(`内容目录: ${contentDir}`);
      logger.info(`临时目录: ${tempDir}`);
      logger.info(`端口: ${options.port}`);

      const child = spawn('npx', ['next', 'dev', '--port', options.port], {
        cwd: appDir,
        stdio: 'inherit',
        env: { ...process.env },
      });

      child.on('error', (err) => {
        logger.error(`启动失败: ${err.message}`);
        process.exit(1);
      });

      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          process.exit(code);
        }
      });

      // Handle graceful shutdown
      const cleanup = () => {
        child.kill();
        process.exit(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(message);
      process.exit(1);
    }
  });
