import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';

export interface ContentFile {
  /** Absolute path to the file */
  filePath: string;
  /** Slug derived from file path relative to contentDir */
  slug: string;
  /** File name without extension */
  name: string;
  /** Parsed frontmatter */
  frontmatter: Record<string, unknown>;
  /** Raw content (without frontmatter) */
  content: string;
  /** Directory segments for tree building */
  segments: string[];
}

export async function scanContentDir(contentDir: string): Promise<ContentFile[]> {
  const pattern = '**/*.{md,mdx}';
  const entries = await fg(pattern, {
    cwd: contentDir,
    absolute: true,
    ignore: ['node_modules'],
  });

  const files: ContentFile[] = [];

  for (const filePath of entries) {
    const file = await parseContentFile(filePath, contentDir);
    if (file) {
      files.push(file);
    }
  }

  return files.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function parseContentFile(filePath: string, contentDir: string): Promise<ContentFile | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);
    const relPath = relative(contentDir, filePath);
    const segments = relPath.replace(/\.(md|mdx)$/, '').split(sep);
    const name = segments.at(-1) ?? '';
    const slug = segments.join('/');

    return {
      filePath,
      slug,
      name,
      frontmatter: frontmatter as Record<string, unknown>,
      content,
      segments,
    };
  } catch {
    return null;
  }
}

export function getContentTree(files: ContentFile[]): ContentDirectory {
  const root: ContentDirectory = { name: '', files: [], children: [] };

  for (const file of files) {
    let current = root;

    for (let i = 0; i < file.segments.length - 1; i++) {
      const segment = file.segments[i]!;
      let child = current.children.find((c) => c.name === segment);
      if (!child) {
        child = { name: segment, files: [], children: [] };
        current.children.push(child);
      }
      current = child;
    }

    current.files.push(file);
  }

  return root;
}

export interface ContentDirectory {
  name: string;
  files: ContentFile[];
  children: ContentDirectory[];
}
