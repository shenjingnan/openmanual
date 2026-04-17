import type { OpenManualConfig } from '../config/schema.js';
import { isOpenApiEnabled } from '../config/schema.js';

export function generateNextConfig(ctx: { config: OpenManualConfig; dev?: boolean }): string {
  const { config } = ctx;
  const siteUrl = config.siteUrl ?? '';
  const isOApi = isOpenApiEnabled(config);

  // dev 模式下不设置 output: 'export'（不兼容 API 路由和 rewrites）
  const outputLine = !ctx.dev && siteUrl ? `\n  output: 'export',` : '';
  // dev 模式下添加 rewrites 将 .md 请求代理到 API 路由
  const rewritesBlock = ctx.dev
    ? `\n  async rewrites() {\n    return [{ source: '/:path(.+)\\\\.md', destination: '/api/raw/:path' }];\n  },`
    : '';

  // serverExternalPackages：mermaid 始终需要；openapi 启用时额外加入 shiki
  const externalsArray = isOApi ? "['mermaid', 'shiki']" : "['mermaid']";

  return `import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,${outputLine}
  serverExternalPackages: ${externalsArray},
  images: {
    unoptimized: true,
  },${rewritesBlock}
};

export default withMDX(config);
`;
}
