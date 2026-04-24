import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';

export interface MetaGroupInfo {
  /** Absolute path to the meta.json file */
  filePath: string;
  /** Directory path relative to contentDir (e.g. "zh/guide" or "zh" for root) */
  dirPath: string;
  /** Computed: whether this is a root-level group (meta.json directly under {lang}/), used for slug generation */
  isRoot: boolean;
  /** From meta.json: whether Fumadocs should treat this as a root folder (Layout Tabs) */
  root?: boolean;
  /** Parsed title from meta.json */
  title: string;
  /** Optional icon from meta.json */
  icon?: string;
  /** Whether the folder is expanded by default (inverted from "collapsed") */
  defaultOpen?: boolean;
  /** Ordered list of page filenames within the group */
  pages?: string[];
}

// Scan all meta.json files in the content directory.
// - i18n mode:     content/{lang}/**/meta.json
// - single-lang:   content/**/meta.json
export async function scanMetaFiles(
  contentAbsDir: string,
  languages: string[]
): Promise<MetaGroupInfo[]> {
  const patterns =
    languages.length > 0 ? languages.map((lang) => `${lang}/**/meta.json`) : ['**/meta.json'];

  const entries = await fg(patterns, {
    cwd: contentAbsDir,
    absolute: true,
    ignore: ['node_modules'],
  });

  const groups: MetaGroupInfo[] = [];

  for (const filePath of entries) {
    const group = await parseMetaFile(filePath, contentAbsDir, languages);
    if (group) {
      groups.push(group);
    }
  }

  return groups;
}

async function parseMetaFile(
  filePath: string,
  contentAbsDir: string,
  languages: string[]
): Promise<MetaGroupInfo | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    if (typeof data.title !== 'string' || data.title.length === 0) {
      return null; // Skip meta.json without a valid title
    }

    const relPath = filePath.replace(contentAbsDir, '').replace(/^\/+/, '');
    const dirPath = relPath.replace(/\/?meta\.json$/, '');

    // Dir-parser mode: root when dirPath equals language code (i18n)
    // Single-language mode: root when dirPath is empty (meta.json at content root)
    let isRoot = false;
    if (languages.length > 0 ? languages.includes(dirPath) : dirPath === '') {
      isRoot = true;
    }

    const group: MetaGroupInfo = {
      filePath,
      dirPath,
      isRoot,
      title: data.title as string,
    };

    if (typeof data.icon === 'string') group.icon = data.icon;
    if (typeof data.root === 'boolean') group.root = data.root;
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
