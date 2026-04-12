import type { OpenManualConfig } from '../config/schema.js';

export function generateNextConfig(ctx: {
  config: OpenManualConfig;
  dev?: boolean;
  ssr?: boolean;
}): string {
  const { config } = ctx;
  const siteUrl = config.siteUrl ?? '';

  // dev 或 ssr 模式下不设置 output: 'export'（SSR 需要服务端渲染能力）
  const outputLine = !ctx.dev && !ctx.ssr && siteUrl ? `\n  output: 'export',` : '';
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
  },${rewritesBlock}
};

export default withMDX(config);
`;
}
