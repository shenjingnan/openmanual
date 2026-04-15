import { resolve } from 'node:path';
import type { GenerateContext } from './index.js';

/**
 * 生成 lib/openapi.ts — createOpenAPI 实例
 */
export function generateOpenAPIInstance(ctx: GenerateContext): string {
  const specPath = resolve(ctx.projectDir, ctx.config.openapi?.spec ?? '');

  return `import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  input: ['${specPath}'],
});
`;
}
