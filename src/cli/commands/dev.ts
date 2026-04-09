import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { generateAll } from '../../core/generator/index.js';
import { checkCodeLangs } from '../../utils/check-code-langs.js';
import { installDeps } from '../../utils/install-deps.js';
import { logger } from '../../utils/logger.js';
import { createSymlink, ensureTempDir, getAppDir } from '../../utils/temp-dir.js';

export const devCommand = new Command('dev')
  .description('启动开发服务器')
  .option('-p, --port <port>', '端口号', '3000')
  .option('--watch', '监听框架源码变更并自动重新生成', false)
  .option('--cwd <path>', '项目目录（watch 模式下使用）')
  .action(async (options) => {
    const cwd = options.cwd ? resolve(options.cwd) : process.cwd();

    try {
      logger.step('读取配置文件...');
      const config = await loadConfig(cwd);

      logger.step('生成临时应用...');
      const tempDir = await ensureTempDir(cwd);
      const appDir = getAppDir(cwd);
      const contentDir = resolve(cwd, config.contentDir ?? 'content');

      // 从 CLI 位置推导 openmanual 包根目录（dist/bin.js → 上溯 1 级到包根目录）
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const openmanualRoot = process.env.OPENMANUAL_ROOT || resolve(__dirname, '..');

      const ctx = {
        config,
        projectDir: cwd,
        appDir,
        contentDir: config.contentDir ?? 'content',
        dev: true,
        openmanualRoot,
      };

      if (process.env.OPENMANUAL_ROOT) {
        await spawnInitialGenerate(openmanualRoot, cwd);
      } else {
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
      }

      // Check for unsupported code block languages
      try {
        const unknownLangs = await checkCodeLangs(contentDir);
        if (unknownLangs.length > 0) {
          logger.warn('以下文件使用了不认识的代码块语言:');
          for (const item of unknownLangs) {
            logger.warn(`  ${item.file}:${item.line} - "${item.lang}"`);
          }
          logger.warn('建议将这些语言改为受支持的类型，或使用 "text" 作为默认值');
        }
      } catch {
        // skip check if shiki is not available
      }

      logger.step('安装依赖...');
      await installDeps(appDir);

      logger.success('开发服务器启动中...');
      logger.info(`内容目录: ${contentDir}`);
      logger.info(`临时目录: ${tempDir}`);
      logger.info(`端口: ${options.port}`);

      const nextChild = spawn('npx', ['next', 'dev', '--port', options.port], {
        cwd: appDir,
        stdio: 'inherit',
        env: { ...process.env },
      });

      nextChild.on('error', (err) => {
        logger.error(`启动失败: ${err.message}`);
        process.exit(1);
      });

      nextChild.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          process.exit(code);
        }
      });

      // Watch mode: monitor framework source and config changes
      let watcher: InstanceType<typeof import('chokidar').FSWatcher> | undefined;
      let regenTimer: ReturnType<typeof setTimeout> | undefined;

      if (options.watch) {
        const openmanualRoot = process.env.OPENMANUAL_ROOT;
        if (!openmanualRoot) {
          logger.warn('OPENMANUAL_ROOT 未设置，无法监听框架源码变更');
        } else {
          const chokidar = await import('chokidar');
          const srcDir = resolve(openmanualRoot, 'src');
          const configFile = resolve(cwd, 'openmanual.json');

          watcher = chokidar.watch(srcDir, {
            ignoreInitial: true,
            ignored: [
              '**/__tests__/**',
              '**/*.test.ts',
              (path: string) => {
                const ext = extname(path);
                if (!ext) return false; // 无扩展名 = 目录，不忽略
                return ext !== '.ts' && ext !== '.tsx';
              },
            ],
          });
          watcher.add(configFile);

          watcher.on('all', (event, filePath) => {
            if (event === 'add' || event === 'change' || event === 'unlink') {
              logger.info(`检测到变更: ${filePath}`);
              clearTimeout(regenTimer);
              regenTimer = setTimeout(() => {
                spawnRegenerate(openmanualRoot, cwd, nextChild);
              }, 300);
            }
          });

          logger.success('Watch 模式已启用，监听框架源码和配置变更');
        }
      }

      // Handle graceful shutdown
      const cleanup = () => {
        clearTimeout(regenTimer);
        watcher?.close();
        nextChild.kill();
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

function spawnInitialGenerate(openmanualRoot: string, cwd: string): Promise<void> {
  const binPath = resolve(openmanualRoot, 'dist/bin.js');
  const child = spawn('node', [binPath, '_regenerate', '--cwd', cwd], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  return new Promise<void>((promiseResolve, promiseReject) => {
    child.on('exit', (code) => {
      if (code === 0) {
        promiseResolve();
      } else {
        promiseReject(new Error(`初始生成失败 (exit code: ${code})`));
      }
    });

    child.on('error', promiseReject);
  });
}

function spawnRegenerate(openmanualRoot: string, cwd: string, nextChild: ChildProcess): void {
  if (nextChild.exitCode !== null) {
    logger.warn('Next.js 进程已退出，跳过重新生成');
    return;
  }

  logger.step('重新生成文件...');

  const binPath = resolve(openmanualRoot, 'dist/bin.js');
  const child = spawn('node', [binPath, '_regenerate', '--cwd', cwd], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    if (code === 0) {
      logger.success('文件重新生成完成');
    } else {
      logger.error(`重新生成失败 (exit code: ${code})`);
    }
  });

  child.on('error', (err) => {
    logger.error(`重新生成进程错误: ${err.message}`);
  });
}
