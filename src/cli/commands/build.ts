import { spawn } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { generateAll } from '../../core/generator/index.js';
import { copyRawMarkdown } from '../../utils/copy-raw-markdown.js';
import { installDeps } from '../../utils/install-deps.js';
import { logger } from '../../utils/logger.js';
import { cleanTempDir, createSymlink, ensureTempDir, getAppDir } from '../../utils/temp-dir.js';

export const buildCommand = new Command('build')
  .description('构建静态站点')
  .option('--ssr', 'SSR 模式（不导出静态文件，保留应用目录供 Vercel 等平台部署）')
  .action(async (opts) => {
    const cwd = process.cwd();

    try {
      logger.step('读取配置文件...');
      const config = await loadConfig(cwd);

      logger.step('生成临时应用...');
      const appDir = getAppDir(cwd);
      const contentDir = resolve(cwd, config.contentDir ?? 'content');

      await ensureTempDir(cwd);

      // 从 CLI 位置推导 openmanual 包根目录（dist/bin.js → 上溯 1 级到包根目录）
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const openmanualRoot = resolve(__dirname, '..');

      const isSSR = !!(opts as { ssr?: boolean }).ssr;

      const ctx = {
        config,
        projectDir: cwd,
        appDir,
        contentDir: config.contentDir ?? 'content',
        ssr: isSSR,
        openmanualRoot,
      };

      // SSR 模式：在生成应用之前先创建预检锚点
      // 解决 Vercel 等平台在 buildCommand 执行前的框架结构检测
      if (isSSR) {
        await createPreBuildAnchors(cwd);
      }

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

      logger.step('构建静态站点...');
      const buildResult = spawn('npx', ['next', 'build'], {
        cwd: appDir,
        stdio: 'inherit',
        env: { ...process.env },
      });

      await new Promise<void>((resolve, reject) => {
        buildResult.on('error', reject);
        buildResult.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });

      if (!isSSR) {
        // 静态导出模式：复制产物并清理临时目录
        const outputDir = resolve(cwd, config.outputDir ?? 'dist');
        await mkdir(outputDir, { recursive: true });

        const nextOutput = resolve(appDir, 'out');
        try {
          await cp(nextOutput, outputDir, { recursive: true });
          logger.success(`静态站点已输出到: ${outputDir}`);
        } catch {
          // If no 'out' dir, check .next/static
          logger.warn('未找到静态导出产物，请检查 next.config.mjs 中 output: "export" 配置');
        }

        logger.step('复制原始 Markdown 文件...');
        await copyRawMarkdown(contentDir, outputDir);

        logger.step('清理临时文件...');
        await cleanTempDir(cwd, config.outputDir);
      } else {
        // SSR 模式：保留应用目录供部署平台使用
        logger.success(`SSR 构建完成，应用目录保留在: ${appDir}`);
        await prepareForPlatformDeployment(cwd, appDir, config.outputDir);
      }

      logger.success('构建完成！');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(message);
      process.exit(1);
    }
  });

/**
 * 在 SSR 构建的最开始阶段，于项目根目录 (cwd) 创建最小化的锚点文件，
 * 用于通过 Vercel 等平台在执行 buildCommand 之前的 Next.js 框架预检。
 *
 * 当 vercel.json 使用 framework: "nextjs" 时，Vercel 会在运行 buildCommand 之前
 * 检查项目根目录是否存在：
 *   1. next.config.* 文件
 *   2. app/ 或 pages/ 目录
 *
 * OpenManual 的真实 Next.js 应用位于 .openmanual/app/ 子目录中（构建时才生成），
 * 因此需要在此阶段放置最小化锚点通过预检。
 * 这些锚点将在 generateAll() 执行后被 prepareForPlatformDeployment() 覆盖为真实文件的符号链接。
 */
async function createPreBuildAnchors(cwd: string): Promise<void> {
  const { writeFile, mkdir } = await import('node:fs/promises');

  // 写入最小化 next.config.mjs 锚点到 cwd
  const nextConfigPath = resolve(cwd, 'next.config.mjs');
  const minimalConfig =
    "/** @type {import('next').NextConfig} */\nconst config = {};\nexport default config;\n";
  try {
    await writeFile(nextConfigPath, minimalConfig, 'utf-8');
    logger.info('已创建 next.config.mjs 预检锚点（供 Vercel 框架检测）');
  } catch {
    // 忽略写入失败
  }

  // 创建空的 app/ 目录占位符（Vercel 同时检查 app/ 或 pages/ 目录是否存在）
  const appDirPlaceholder = resolve(cwd, 'app');
  try {
    await mkdir(appDirPlaceholder, { recursive: true });
    logger.info('已创建 app/ 目录占位符（供 Vercel 框架检测）');
  } catch {
    // 忽略创建失败
  }
}

/**
 * 在 SSR 构建完成后，为 Vercel 等 PaaS 平台准备部署所需的文件结构。
 *
 * 平台（如 Vercel）的 Next.js 框架预设会在项目根目录查找 next.config.* 和 .next/ 目录。
 * 但 OpenManual 将 Next.js 应用生成在 .openmanual/app/ 子目录中，
 * 因此在根目录创建符号链接指向实际文件，让平台的检测逻辑能找到标准 Next.js 项目结构。
 */
async function prepareForPlatformDeployment(
  cwd: string,
  appDir: string,
  outputDir?: string
): Promise<void> {
  const { symlink, rm, lstat } = await import('node:fs/promises');
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';

  // 创建 next.config.mjs 符号链接 -> .openmanual/app/next.config.mjs
  // 先删除可能存在的预检锚点普通文件
  const nextConfigSrc = resolve(appDir, 'next.config.mjs');
  const nextConfigDest = resolve(cwd, 'next.config.mjs');
  try {
    const existing = await lstat(nextConfigDest);
    if (!existing.isSymbolicLink()) {
      await rm(nextConfigDest, { force: true });
    }
  } catch {
    // 不存在，继续
  }
  try {
    await symlink(nextConfigSrc, nextConfigDest, symlinkType);
    logger.info('已创建 next.config.mjs 符号链接（供平台部署检测）');
  } catch {
    // 忽略
  }

  // 创建 .next 符号链接 -> .openmanual/app/.next
  const nextDirSrc = resolve(appDir, '.next');
  const nextDirDest = resolve(cwd, '.next');
  try {
    await symlink(nextDirSrc, nextDirDest, symlinkType);
    logger.info('已创建 .next 符号链接（供平台部署检测）');
  } catch {
    // 忽略已存在或其他错误
  }

  // 创建 outputDir 符号链接 -> .openmanual/app/.next
  if (outputDir) {
    const outputDirDest = resolve(cwd, outputDir);
    try {
      await symlink(nextDirSrc, outputDirDest, symlinkType);
      logger.info(`已创建 ${outputDir} 符号链接 -> .next（供平台 Output Directory 检测）`);
    } catch {
      // 忽略已存在或其他错误
    }
  }
}
