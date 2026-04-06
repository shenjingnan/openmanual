import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';

/**
 * Recursively copy .mdx/.md files from contentDir to targetDir,
 * renaming extensions to .md. Non-markdown files are skipped.
 */
export async function copyRawMarkdown(contentDir: string, targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(contentDir);
  for (const entry of entries) {
    const srcPath = join(contentDir, entry);
    const srcStat = await stat(srcPath);

    if (srcStat.isDirectory()) {
      await copyRawMarkdown(srcPath, join(targetDir, entry));
    } else {
      const ext = parse(entry).ext.toLowerCase();
      if (ext === '.mdx' || ext === '.md') {
        const { name } = parse(entry);
        const destPath = join(targetDir, `${name}.md`);
        await copyFile(srcPath, destPath);
      }
    }
  }
}
