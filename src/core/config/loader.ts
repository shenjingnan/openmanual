import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeTopLevelLogo, type OpenManualConfig, OpenManualConfigSchema } from './schema.js';

const DEFAULT_CONFIG: Partial<OpenManualConfig> = {
  contentDir: 'content',
  outputDir: 'dist',
  locale: 'zh',
  navbar: {},
  footer: {},
  mdx: {},
  pageActions: { enabled: true },
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
  // 解析顶级 logo（如有），用于后续传播
  const topLevelLogo = config.logo ? normalizeTopLevelLogo(config.logo) : null;

  // 将顶级 logo 的 light/dark 部分提取为 LogoConfig 格式（去掉 position）
  const topLevelLogoSource = topLevelLogo
    ? topLevelLogo.light === topLevelLogo.dark
      ? topLevelLogo.light
      : { light: topLevelLogo.light, dark: topLevelLogo.dark }
    : null;

  return {
    ...config,
    contentPolicy: config.contentPolicy ?? 'strict',
    contentDir: config.contentDir ?? DEFAULT_CONFIG.contentDir ?? 'content',
    outputDir: config.outputDir ?? DEFAULT_CONFIG.outputDir ?? 'dist',
    locale: config.locale ?? DEFAULT_CONFIG.locale ?? 'zh',
    // 标准化顶级 logo 的 position 默认值
    logo: topLevelLogo
      ? typeof config.logo === 'string'
        ? config.logo
        : { light: topLevelLogo.light, dark: topLevelLogo.dark, position: topLevelLogo.position }
      : undefined,
    navbar: {
      ...DEFAULT_CONFIG.navbar,
      ...config.navbar,
      // 传播逻辑：有顶级 logo 且 position=sidebar → 传播到 navbar.logo
      // 否则保持原有 navbar.logo ?? config.name 逻辑
      logo:
        config.navbar?.logo ??
        (topLevelLogo && topLevelLogo.position === 'sidebar'
          ? (topLevelLogoSource ?? config.name)
          : config.name),
    },
    header: config.header
      ? {
          ...config.header,
          // 传播逻辑：有顶级 logo 且 position=header → 传播到 header.logo
          // 否则保持原有 header.logo 不变
          logo:
            config.header.logo ??
            (topLevelLogo && topLevelLogo.position === 'header'
              ? (topLevelLogoSource ?? undefined)
              : undefined),
        }
      : undefined,
    footer: {
      ...DEFAULT_CONFIG.footer,
      ...config.footer,
      text: config.footer?.text ?? `MIT ${new Date().getFullYear()} © ${config.name}.`,
    },
    // 搜索默认启用，用户可通过 position 控制搜索入口位置
    search: { position: config.search?.position ?? 'sidebar' },
    mdx: {
      ...DEFAULT_CONFIG.mdx,
      ...config.mdx,
    },
    pageActions: {
      ...DEFAULT_CONFIG.pageActions,
      ...config.pageActions,
    },
    i18n: config.i18n
      ? {
          enabled: config.i18n.enabled ?? false,
          defaultLanguage: config.i18n.defaultLanguage ?? config.locale ?? 'zh',
          languages: config.i18n.languages ?? [],
          parser: config.i18n.parser ?? 'dot',
        }
      : undefined,
    openapi: config.openapi
      ? {
          specPath: config.openapi.specPath,
          specs: config.openapi.specs,
          label: config.openapi.label ?? '接口文档',
          groupBy: config.openapi.groupBy ?? 'tag',
          separateTab: config.openapi.separateTab ?? false,
        }
      : undefined,
  };
}
