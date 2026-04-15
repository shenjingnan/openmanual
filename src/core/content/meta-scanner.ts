import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';

export interface MetaGroupInfo {
  /** Absolute path to the meta.json file */
  filePath: string;
  /** Directory path relative to contentDir (e.g. "zh/guide" or "zh" for root) */
  dirPath: string;
  /** Whether this is a root-level group (meta.json directly under {lang}/) */
  isRoot: boolean;
  /** Parsed title from meta.json */
  title: string;
  /** Optional icon from meta.json */
  icon?: string;
  /** Whether the folder is expanded by default (inverted from "collapsed") */
  defaultOpen?: boolean;
  /** Ordered list of page filenames within this group */
  pages?: string[];
}

// Scan all meta.json files in the content directory and return structured info.
// Supports dir-parser (content/{lang}/**/meta.json) and dot-parser modes.
export async function scanMetaFiles(
  contentAbsDir: string,
  languages: string[],
  useDirParser: boolean
): Promise<MetaGroupInfo[]> {
  let patterns: string[];

  if (useDirParser) {
    // Dir-parser: each language has its own subdirectory with meta.json files
    patterns = languages.map((lang) => `${lang}/**/meta.json`);
  } else {
    // Dot-parser: meta.json at directory level + locale-suffixed variants
    patterns = ['**/meta.json'];
    if (languages.length > 1) {
      for (const lang of languages) {
        patterns.push(`**/meta.${lang}.json`);
      }
    }
  }

  const entries = await fg(patterns, {
    cwd: contentAbsDir,
    absolute: true,
    ignore: ['node_modules'],
  });

  const groups: MetaGroupInfo[] = [];

  for (const filePath of entries) {
    const group = await parseMetaFile(filePath, contentAbsDir, languages, useDirParser);
    if (group) {
      groups.push(group);
    }
  }

  return groups;
}

async function parseMetaFile(
  filePath: string,
  contentAbsDir: string,
  languages: string[],
  useDirParser: boolean
): Promise<MetaGroupInfo | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    if (typeof data.title !== 'string' || data.title.length === 0) {
      return null; // Skip meta.json without a valid title
    }

    const relPath = filePath.replace(contentAbsDir, '').replace(/^\/+/, '');
    const dirPath = relPath.replace(/\/?meta(\.[^/]+)?\.json$/, '');

    // Determine if this is a root-level meta.json
    // In dir-parser mode: content/{lang}/meta.json → isRoot when dirPath equals language code
    // In dot-parser mode: content/meta.json → isRoot when dirPath is empty
    let isRoot = false;
    if (useDirParser) {
      isRoot = languages.includes(dirPath);
    } else {
      // For dot-parser, skip locale-suffixed meta files for non-default languages
      const isLocaleSuffixed = /meta\.\w{2}(-\w{2})?\.json$/.test(relPath);
      if (isLocaleSuffixed && languages.length > 1) {
        return null; // Skip locale variants - only process base meta.json
      }
      // Root only when meta.json is at the content root (empty dirPath)
      isRoot = dirPath === '';
    }

    const group: MetaGroupInfo = {
      filePath,
      dirPath,
      isRoot,
      title: data.title as string,
    };

    if (typeof data.icon === 'string') group.icon = data.icon;
    if (typeof data.defaultOpen === 'boolean') group.defaultOpen = data.defaultOpen;
    if (Array.isArray(data.pages)) {
      group.pages = (data.pages as string[]).filter((p) => typeof p === 'string');
    }

    return group;
  } catch {
    return null; // Skip unreadable or invalid JSON files
  }
}

/**
 * Collect all slugs from meta group infos.
 *
 * For root-level groups, page filenames are used directly as slugs.
 * For directory-level groups, page filenames are prefixed with the directory path.
 */
export function collectSlugsFromMeta(groups: MetaGroupInfo[]): Set<string> {
  const slugs = new Set<string>();

  for (const group of groups) {
    if (!group.pages) continue;

    for (const page of group.pages) {
      if (group.isRoot) {
        // Root-level: filename is the slug (e.g. "index", "quickstart")
        slugs.add(page);
      } else {
        // Directory-level: prefix with dirPath (e.g. "guide/configuration")
        const slug = `${group.dirPath}/${page}`;
        slugs.add(slug);
      }
    }
  }

  return slugs;
}
