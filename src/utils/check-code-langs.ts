import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export interface UnknownLang {
  file: string;
  line: number;
  lang: string;
}

export async function checkCodeLangs(contentDir: string): Promise<UnknownLang[]> {
  const { bundledLanguages } = await import('shiki');
  const supportedLangs = new Set(Object.keys(bundledLanguages));
  supportedLangs.add('text');
  supportedLangs.add('txt');
  supportedLangs.add('plaintext');
  supportedLangs.add('plain');
  supportedLangs.add('ansi');

  const files = await collectMdFiles(contentDir);
  const results: UnknownLang[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^```(\S+)/);
      if (match) {
        const lang = match[1];
        if (!supportedLangs.has(lang)) {
          results.push({
            file: relative(contentDir, file).split(sep).join('/'),
            line: i + 1,
            lang,
          });
        }
      }
    }
  }

  return results;
}

async function collectMdFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMdFiles(fullPath)));
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}
