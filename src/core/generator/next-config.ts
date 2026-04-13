import type { OpenManualConfig } from '../config/schema.js';
import { isSsrMode } from '../config/schema.js';

export function generateNextConfig(ctx: { config: OpenManualConfig; dev?: boolean }): string {
  const { config } = ctx;
  const siteUrl = config.siteUrl ?? '';
  const ssr = isSsrMode(config);

  // SSR 模式或 dev 模式下不设置 output: 'export'（不兼容 API 路由和 rewrites）
  const outputLine = !ctx.dev && !ssr && siteUrl ? `\n  output: 'export',` : '';
  // SSR 模式下二次 build 时跳过类型检查（首次 build 已完成类型检查，
  // 二次 build 仅需确保 .next/ 产物自包含于输出目录）
  const tsIgnoreErrors = ssr ? `\n  typescript: { ignoreBuildErrors: true },` : '';
  // dev 模式下添加 rewrites 将 .md 请求代理到 API 路由
  const rewritesBlock = ctx.dev
    ? `\n  async rewrites() {\n    return [{ source: '/:path(.+)\\\\.md', destination: '/api/raw/:path' }];\n  },`
    : '';

  return `import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,${outputLine}
  serverExternalPackages: ['mermaid'],
  images: {
    unoptimized: true,
  },${tsIgnoreErrors}${rewritesBlock}
};

export default withMDX(config);
`;
}
