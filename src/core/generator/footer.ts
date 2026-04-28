import { isI18nEnabled } from '../config/schema.js';
import { jsLiteral } from './code-utils.js';
import type { GenerateContext } from './index.js';

/**
 * 生成 app/components/footer.tsx（单语言）或 app/[lang]/components/footer.tsx（i18n）
 *
 * 从 openmanual.json 的 footer.columns 配置读取多列 Footer 数据，
 * 输出配置好的 OmSiteFooter 组件。
 *
 * 无 columns 配置时返回 null 组件（向后兼容）。
 *
 * i18n 模式下，组件接收 lang prop 并在运行时动态拼接路径前缀。
 */
export function generateFooterComponent(ctx: GenerateContext): string {
  const { config } = ctx;
  const columns = config.footer?.columns;

  if (!columns) {
    return `'use client';

export function OmSiteFooter() {
  return null;
}
`;
  }

  const columnsJson = JSON.stringify(columns);
  const defaultName = jsLiteral(config.name);
  const isI18n = isI18nEnabled(config);

  if (isI18n) {
    return `'use client';

import { SiteFooter } from 'openmanual/components/site-footer';

const rawFooterColumns = ${columnsJson};

export function OmSiteFooter({ lang }: { lang: string }) {
  const columns = {
    ...rawFooterColumns,
    groups: rawFooterColumns.groups.map((group) => ({
      ...group,
      links: group.links.map((link) => ({
        ...link,
        href: link.external ? link.href : \`/\${lang}\${link.href.startsWith('/') ? '' : '/'}\${link.href}\`,
      })),
    })),
    social: rawFooterColumns.social.map((s) => s),
  };

  return <SiteFooter columns={columns} defaultName=${defaultName} />;
}
`;
  }

  return `'use client';

import { SiteFooter } from 'openmanual/components/site-footer';

const footerColumns = ${columnsJson};

export function OmSiteFooter() {
  return <SiteFooter columns={footerColumns} defaultName=${defaultName} />;
}
`;
}
