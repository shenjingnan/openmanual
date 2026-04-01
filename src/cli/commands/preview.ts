import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { logger } from '../../utils/logger.js';

export const previewCommand = new Command('preview')
  .description('预览构建产物')
  .option('-p, --port <port>', '端口号', '8080')
  .option('-d, --dir <dir>', '产物目录')
  .action(async (options) => {
    const cwd = process.cwd();

    try {
      let outputDir = options.dir;
      if (!outputDir) {
        const config = await loadConfig(cwd);
        outputDir = resolve(cwd, config.outputDir ?? 'dist');
      }

      if (!existsSync(outputDir)) {
        logger.error(`产物目录不存在: ${outputDir}`);
        logger.info('请先运行 openmanual build');
        process.exit(1);
      }

      logger.info(`预览目录: ${outputDir}`);
      logger.info(`预览地址: http://localhost:${options.port}`);

      const child = spawn('npx', ['serve', outputDir, '-p', options.port], {
        stdio: 'inherit',
        env: { ...process.env },
      });

      child.on('error', (err) => {
        logger.error(`启动失败: ${err.message}`);
        process.exit(1);
      });

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
