import { spawn } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { isSsrMode } from '../../core/config/schema.js';
import { generateAll } from '../../core/generator/index.js';
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

    const ssr = isSsrMode(config);

    if (ssr) {
      // SSR 模式：复制 app 目录（不含 node_modules）到输出目录，供 Vercel 等平台作为 Next.js 应用运行
      try {
        // 先清理旧的输出目录，避免残留文件干扰
        await rm(outputDir, { recursive: true, force: true });
        await mkdir(outputDir, { recursive: true });

        // 逐项复制顶层目录/文件，排除 node_modules（pnpm 符号链接结构会导致 fs.cp 报 EINVAL）
        const entries = await readdir(appDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules') continue;
          const srcPath = resolve(appDir, entry.name);
          const destPath = resolve(outputDir, entry.name);
          if (entry.isDirectory()) {
            await cp(srcPath, destPath, { recursive: true, verbatimSymlinks: true });
          } else {
            await cp(srcPath, destPath);
          }
        }

        // pnpm 的 node_modules 使用符号链接，复制后需要重新安装依赖以修复链接
        // 修复 package.json 中的 file: 依赖为实际版本号，否则 pnpm install 无法在输出目录解析相对路径
        const pkgPath = resolve(outputDir, 'package.json');
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        if (
          typeof pkg.dependencies?.openmanual === 'string' &&
          pkg.dependencies.openmanual.startsWith('file:')
        ) {
          const rootPkg = JSON.parse(
            await readFile(resolve(openmanualRoot, 'package.json'), 'utf-8')
          );
          pkg.dependencies.openmanual = `^${rootPkg.version}`;
          await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        }

        logger.step('重新安装输出目录依赖...');
        await installDeps(outputDir);

        // 在输出目录中再次执行 next build，确保 .next/ 产物自包含
        // 避免 Vercel 等 platform 做 output file tracing 时追溯到已删除的临时目录
        logger.step('在输出目录中执行 final next build...');
        const finalBuild = spawn('npx', ['next', 'build'], {
          cwd: outputDir,
          stdio: 'inherit',
          env: { ...process.env, NODE_ENV: 'production' },
        });
        await new Promise<void>((resolve, reject) => {
          finalBuild.on('error', reject);
          finalBuild.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Final next build failed with code ${code}`));
          });
        });

        logger.success(`SSR 应用已输出到: ${outputDir}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`复制 SSR 产物失败: ${message}`);
        throw err;
      }
    } else {
      // SSG 模式：复制 out/ 静态文件到输出目录
      const nextOutput = resolve(appDir, 'out');
      try {
        await cp(nextOutput, outputDir, { recursive: true });
        logger.success(`静态站点已输出到: ${outputDir}`);
      } catch {
        // If no 'out' dir, check .next/static
        logger.warn('未找到静态导出产物，请检查 next.config.mjs 中 output: "export" 配置');
      }
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

    logger.step('清理临时文件...');
    await cleanTempDir(cwd);

    logger.success('构建完成！');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    process.exit(1);
  }
});
