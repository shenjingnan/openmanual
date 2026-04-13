import { z } from 'zod';

export const LogoSchema = z.union([z.string(), z.object({ light: z.string(), dark: z.string() })]);

export const FaviconSchema = z.string();

export const NavbarSchema = z.object({
  logo: LogoSchema.optional(),
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

export const SidebarPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  icon: z.string().optional(),
});

export const SidebarGroupSchema = z.object({
  group: z.string(),
  icon: z.string().optional(),
  collapsed: z.boolean().optional(),
  pages: z.array(SidebarPageSchema),
});

export const ThemeSchema = z.object({
  primaryHue: z.number().min(0).max(360).optional(),
  darkMode: z.boolean().optional(),
});

export const SearchSchema = z.object({
  enabled: z.boolean().optional(),
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

export const OutputModeSchema = z.enum(['ssg', 'ssr']).default('ssg').optional();

export const OpenManualConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contentDir: z.string().optional(),
  outputDir: z.string().optional(),
  outputMode: OutputModeSchema,
  siteUrl: z.url().optional(),
  locale: z.string().optional(),
  contentPolicy: z.enum(['strict', 'all']).optional(),
  favicon: FaviconSchema.optional(),
  navbar: NavbarSchema.optional(),
  footer: FooterSchema.optional(),
  sidebar: z.array(SidebarGroupSchema).optional(),
  theme: ThemeSchema.optional(),
  search: SearchSchema.optional(),
  mdx: MdxSchema.optional(),
  pageActions: PageActionsSchema.optional(),
  i18n: I18nConfigSchema.optional(),
});

export type OutputMode = z.infer<typeof OutputModeSchema>;
export type OpenManualConfig = z.infer<typeof OpenManualConfigSchema>;
export type NavbarConfig = z.infer<typeof NavbarSchema>;
export type FooterConfig = z.infer<typeof FooterSchema>;
export type SidebarGroup = z.infer<typeof SidebarGroupSchema>;
export type SidebarPage = z.infer<typeof SidebarPageSchema>;
export type ThemeConfig = z.infer<typeof ThemeSchema>;
export type LogoConfig = z.infer<typeof LogoSchema>;
export type FaviconConfig = z.infer<typeof FaviconSchema>;
export type I18nLocale = z.infer<typeof I18nLocaleSchema>;
export type I18nConfig = z.infer<typeof I18nConfigSchema>;

export function collectConfiguredSlugs(config: OpenManualConfig): Set<string> {
  const slugs = new Set<string>();
  if (config.sidebar) {
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        slugs.add(page.slug);
      }
    }
  }
  return slugs;
}

export function buildTitleMap(config: OpenManualConfig): Record<string, string> {
  const map: Record<string, string> = {};
  if (config.sidebar) {
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        map[page.slug] = page.title;
      }
    }
  }
  return map;
}

export function isI18nEnabled(config: OpenManualConfig): boolean {
  return config.i18n?.enabled === true && (config.i18n.languages?.length ?? 0) > 1;
}

export function isDirParser(config: OpenManualConfig): boolean {
  return config.i18n?.parser === 'dir';
}

export function isSsrMode(config: OpenManualConfig): boolean {
  return config.outputMode === 'ssr';
}
