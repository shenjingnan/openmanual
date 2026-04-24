import { z } from 'zod';

export const LogoSchema = z.union([z.string(), z.object({ light: z.string(), dark: z.string() })]);

/**
 * 顶级 Logo 配置（支持字符串简写和对象形式）
 * - 字符串简写: "/logo.svg" → { light, dark: 同值 }
 * - 对象形式: { light, dark }
 *
 * 注意：logo 始终展示在 header (TopBar) 中，不再支持 sidebar 位置。
 * 使用 .passthrough() 向后兼容：用户配置中的 position 字段会被忽略而不报错。
 */
export const TopLevelLogoSchema = z.union([
  z.string(),
  z
    .object({
      light: z.string(),
      dark: z.string(),
    })
    .passthrough(),
]);

export const FaviconSchema = z.string();

export const NavbarSchema = z.object({
  /** @deprecated 使用顶级 `logo` 字段代替 */
  logo: LogoSchema.optional(),
  /** @deprecated 使用 header.links 配置替代，例如 { "icon": "Github", "href": "https://github.com/..." } */
  github: z.url().optional(),
  links: z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      })
    )
    .optional(),
});

export const FooterSchema = z.object({
  text: z.string().optional(),
});

// @deprecated Use meta.json files in content directories instead
export const SidebarPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  icon: z.string().optional(),
});

// @deprecated Use meta.json files in content directories instead
export const SidebarGroupSchema = z.object({
  group: z.string(),
  icon: z.string().optional(),
  collapsed: z.boolean().optional(),
  pages: z.array(SidebarPageSchema),
});

export const MdxSchema = z.object({
  latex: z.boolean().optional(),
});

export const PageActionsSchema = z.object({
  enabled: z.boolean().optional(),
});

export const I18nLocaleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});

export const I18nConfigSchema = z.object({
  enabled: z.boolean().optional(),
  defaultLanguage: z.string().optional(),
  languages: z.array(I18nLocaleSchema).optional(),
  parser: z.enum(['dot', 'dir']).optional(),
});

export const OpenApiSpecSchema = z.object({
  /** OpenAPI 规范文件路径，相对于项目根目录 */
  path: z.string(),
  /** 分组标签（用于在侧边栏中显示的分组名） */
  group: z.string().optional(),
});

export const OpenApiSchema = z.object({
  /**
   * OpenAPI 规范文件路径（单个文件），相对于项目根目录。支持 .json / .yaml / .yml
   * @deprecated 推荐使用 specs 字段
   */
  specPath: z.string().optional(),
  /**
   * OpenAPI 规范文件配置，支持字符串（单文件）或对象数组（多文件）
   * - string: 单个 spec 文件路径
   * - array: 多个 spec 文件配置，每个可指定 path 和 group
   */
  specs: z.union([z.string(), z.array(OpenApiSpecSchema)]).optional(),
  /** 侧边栏 Tab 显示名称，默认 "接口文档"（仅在 separateTab: true 时生效） */
  label: z.string().optional(),
  /**
   * API 端点在侧边栏中的分组策略
   * - 'tag': 按 OpenAPI 规范中的 tags 分组（默认）
   * - 'route': 按路由路径分组
   * - 'none': 不分组，平铺展示
   */
  groupBy: z.enum(['tag', 'route', 'none']).optional().default('tag'),
  /**
   * 是否将 API 文档作为独立的侧边栏 Tab 展示
   * - true: 保持旧行为，API 文档在独立 Tab 中（向后兼容）
   * - false: 将 API 端点混合到文档导航树中（类似 Mintlify 风格） // cspell:ignore Mintlify
   */
  separateTab: z.boolean().optional().default(false),
});

/** 顶部横条链接项 */
export const TopBarLinkSchema = z
  .object({
    /** 链接显示文本（与 icon 至少填一个） */
    label: z.string().optional(),
    /** lucide-react 图标名称（如 "Github", "Twitter"，与 label 至少填一个） */
    icon: z.string().optional(),
    href: z.string(),
    external: z.boolean().optional().default(true),
  })
  .refine((data) => data.label || data.icon, {
    message: '至少需要提供 label 或 icon 中的一个',
    path: ['label'],
  });

/** 顶部横条配置 */
export const TopBarSchema = z.object({
  /** 高度，默认 '64px' */
  height: z.string().optional(),
  /** @deprecated 使用顶级 `logo` 字段代替（logo 始终显示在 header 中） */
  logo: LogoSchema.optional(),
  /** 右侧导航链接 */
  links: z.array(TopBarLinkSchema).optional(),
  /** 是否显示粘性（sticky），默认 true */
  sticky: z.boolean().optional().default(true),
  /** 背景色（CSS 值） */
  background: z.string().optional(),
  /** 底部边框 */
  bordered: z.boolean().optional().default(true),
});

export const OpenManualConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contentDir: z.string().optional(),
  outputDir: z.string().optional(),
  siteUrl: z.url().optional(),
  locale: z.string().optional(),
  contentPolicy: z.enum(['strict', 'all']).optional(),
  favicon: FaviconSchema.optional(),
  /** 顶级 Logo 配置（替代 navbar.logo / header.logo） */
  logo: TopLevelLogoSchema.optional(),
  navbar: NavbarSchema.optional(),
  header: TopBarSchema.optional(),
  footer: FooterSchema.optional(),
  // @deprecated Use meta.json files in content directories instead
  sidebar: z.array(SidebarGroupSchema).optional(),
  mdx: MdxSchema.optional(),
  pageActions: PageActionsSchema.optional(),
  i18n: I18nConfigSchema.optional(),
  openapi: OpenApiSchema.optional(),
});

export type OpenManualConfig = z.infer<typeof OpenManualConfigSchema>;
export type NavbarConfig = z.infer<typeof NavbarSchema>;
export type FooterConfig = z.infer<typeof FooterSchema>;
export type SidebarGroup = z.infer<typeof SidebarGroupSchema>;
export type SidebarPage = z.infer<typeof SidebarPageSchema>;
export type LogoConfig = z.infer<typeof LogoSchema>;
export type FaviconConfig = z.infer<typeof FaviconSchema>;
export type I18nLocale = z.infer<typeof I18nLocaleSchema>;
export type I18nConfig = z.infer<typeof I18nConfigSchema>;
export type OpenApiConfig = z.infer<typeof OpenApiSchema>;
export type TopBarConfig = z.infer<typeof TopBarSchema>;
export type TopBarLink = z.infer<typeof TopBarLinkSchema>;
export type TopLevelLogoConfig = z.infer<typeof TopLevelLogoSchema>;

// @deprecated Use collectSlugsFromMeta from meta-scanner instead
export function collectConfiguredSlugs(config: OpenManualConfig): Set<string> {
  const slugs = new Set<string>();
  if (config.sidebar) {
    console.warn(
      '[openmanual] The "sidebar" field in openmanual.json is deprecated. ' +
        'Please use meta.json files in your content directories instead.'
    );
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        slugs.add(page.slug);
      }
    }
  }
  return slugs;
}

export function isI18nEnabled(config: OpenManualConfig): boolean {
  return config.i18n?.enabled === true && (config.i18n.languages?.length ?? 0) > 1;
}

export function isDirParser(config: OpenManualConfig): boolean {
  return config.i18n?.parser === 'dir';
}

export function isOpenApiEnabled(config: OpenManualConfig): boolean {
  if (config.openapi === undefined) return false;
  // 检查 specs（新格式）或 specPath（旧格式，向后兼容）
  const hasSpecs = config.openapi.specs !== undefined;
  const hasSpecPath = typeof config.openapi?.specPath === 'string';
  return hasSpecs || hasSpecPath;
}

/**
 * 从 OpenAPI 配置中解析出所有 spec 文件路径
 * 兼容 specs（新）和 specPath（旧）两种格式
 */
export function resolveOpenApiSpecPaths(config: OpenManualConfig): string[] {
  const openApiCfg = config.openapi;
  if (!openApiCfg) return [];

  // 新格式：specs 数组或字符串
  if (openApiCfg.specs !== undefined) {
    if (typeof openApiCfg.specs === 'string') {
      return [openApiCfg.specs];
    }
    return openApiCfg.specs.map((s) => s.path);
  }

  // 旧格式：specPath 字符串
  if (typeof openApiCfg.specPath === 'string') {
    return [openApiCfg.specPath];
  }

  return [];
}

/**
 * 判断是否使用独立 Tab 模式（旧行为）
 */
export function isSeparateTabMode(config: OpenManualConfig): boolean {
  return config.openapi?.separateTab === true;
}

/**
 * 判断是否启用了顶部横条（默认始终启用）
 */
export function isHeaderEnabled(_config: OpenManualConfig): boolean {
  return true;
}

/**
 * 将顶级 logo 配置标准化为 { light, dark } 形式
 */
export function normalizeTopLevelLogo(logo: TopLevelLogoConfig): {
  light: string;
  dark: string;
} {
  if (typeof logo === 'string') {
    return { light: logo, dark: logo };
  }
  return {
    light: logo.light,
    dark: logo.dark,
  };
}

/**
 * 解析有效的 Logo 配置源（统一优先级链）
 *
 * 优先级：
 * 1. config.logo（新顶级配置）
 * 2. config.header.logo（旧 header logo）
 * 3. undefined（调用方回退到 config.name）
 *
 * 注意：logo 始终展示在 header 中，不再区分 position。
 */
export function resolveEffectiveLogo(config: OpenManualConfig): LogoConfig | undefined {
  // 新顶级 logo 最高优先级
  if (config.logo) {
    const normalized = normalizeTopLevelLogo(config.logo);
    const { light, dark } = normalized;
    return light === dark ? light : ({ light, dark } as LogoConfig);
  }

  // 旧 header.logo
  if (config.header?.logo) {
    return config.header.logo;
  }

  return undefined;
}
