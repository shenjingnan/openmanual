import { spawn } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { generateAll } from '../../core/generator/index.js';
import { copyRawMarkdown } from '../../utils/copy-raw-markdown.js';
import { installDeps } from '../../utils/install-deps.js';
import { logger } from '../../utils/logger.js';
import { cleanTempDir, createSymlink, ensureTempDir, getAppDir } from '../../utils/temp-dir.js';

export const buildCommand = new Command('build').description('构建静态站点').action(async () => {
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

    const ctx = {
      config,
      projectDir: cwd,
      appDir,
      contentDir: config.contentDir ?? 'content',
      openmanualRoot,
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

    // Copy output to user's output dir
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

    // i18n 模式下生成根目录 index.html，重定向到默认语言路径
    if (config.i18n?.enabled) {
      const defaultLang = config.i18n.defaultLanguage ?? config.locale ?? 'zh';
      const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=/${defaultLang}" />
  <script>window.location.href='/${defaultLang}';</script>
</head>
<body>
  <p>Redirecting to <a href="/${defaultLang}">/${defaultLang}</a>...</p>
</body>
</html>`;
      await writeFile(resolve(outputDir, 'index.html'), redirectHtml, 'utf-8');
    }

    logger.step('复制原始 Markdown 文件...');
    await copyRawMarkdown(contentDir, outputDir);

    logger.step('清理临时文件...');
    await cleanTempDir(cwd);

    logger.success('构建完成！');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    process.exit(1);
  }
});
