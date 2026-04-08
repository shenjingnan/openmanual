import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig } from '../../core/config/loader.js';
import { generateAll } from '../../core/generator/index.js';
import { createSymlink, ensureTempDir, getAppDir } from '../../utils/temp-dir.js';

export const regenerateCommand = new Command('_regenerate')
  .description('内部命令：重新生成文件')
  .helpOption(false)
  .option('--cwd <path>', '项目目录')
  .action(async (options) => {
    const cwd = options.cwd ?? process.cwd();

    try {
      const config = await loadConfig(cwd);
      const appDir = getAppDir(cwd);
      const contentDir = resolve(cwd, config.contentDir ?? 'content');

      const ctx = {
        config,
        projectDir: cwd,
        appDir,
        contentDir: config.contentDir ?? 'content',
        ...(process.env.OPENMANUAL_ROOT ? { openmanualRoot: process.env.OPENMANUAL_ROOT } : {}),
      };

      await ensureTempDir(cwd);

      // 清理旧的生成物，避免残留文件导致冲突
      const entriesToClean = [
        'app',
        'lib',
        'source.config.ts',
        'next.config.mjs',
        'global.css',
        'package.json',
        'tsconfig.json',
        'postcss.config.mjs',
      ];
      for (const entry of entriesToClean) {
        await rm(join(appDir, entry), { recursive: true, force: true });
      }

      await generateAll(ctx);
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

      console.log('[openmanual] regenerate:ok');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[openmanual] regenerate:fail ${message}`);
      process.exit(1);
    }
  });
