import type { OpenManualConfig } from '../config/schema.js';

export function generateNextConfig(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const siteUrl = config.siteUrl ?? '';

  return `import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,${siteUrl ? `\n  output: 'export',` : ''}
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
`;
}
