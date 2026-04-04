import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type OpenManualConfig, OpenManualConfigSchema } from './schema.js';

const DEFAULT_CONFIG: Partial<OpenManualConfig> = {
  contentDir: 'content',
  outputDir: 'dist',
  locale: 'zh',
  navbar: {},
  footer: {},
  theme: {
    primaryHue: 213,
    darkMode: true,
  },
  search: {
    enabled: true,
  },
  mdx: {},
};

export async function loadConfig(cwd: string = process.cwd()): Promise<OpenManualConfig> {
  const configPath = join(cwd, 'openmanual.json');

  let rawJson: string;
  try {
    rawJson = await readFile(configPath, 'utf-8');
  } catch {
    throw new Error(`openmanual.json not found in ${cwd}. Please create one.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('openmanual.json is not valid JSON.');
  }

  const result = OpenManualConfigSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`openmanual.json validation failed:\n${errors}`);
  }

  return mergeDefaults(result.data);
}

function mergeDefaults(config: OpenManualConfig): OpenManualConfig {
  return {
    ...config,
    contentPolicy: config.contentPolicy ?? 'strict',
    contentDir: config.contentDir ?? DEFAULT_CONFIG.contentDir ?? 'content',
    outputDir: config.outputDir ?? DEFAULT_CONFIG.outputDir ?? 'dist',
    locale: config.locale ?? DEFAULT_CONFIG.locale ?? 'zh',
    navbar: {
      ...DEFAULT_CONFIG.navbar,
      ...config.navbar,
      logo: config.navbar?.logo ?? config.name,
    },
    footer: {
      ...DEFAULT_CONFIG.footer,
      ...config.footer,
      text: config.footer?.text ?? `MIT ${new Date().getFullYear()} © ${config.name}.`,
    },
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...config.theme,
    },
    search: {
      ...DEFAULT_CONFIG.search,
      ...config.search,
    },
    mdx: {
      ...DEFAULT_CONFIG.mdx,
      ...config.mdx,
    },
  };
}
