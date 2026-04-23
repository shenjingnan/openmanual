import { join } from 'node:path';
import type { OpenManualConfig } from '../config/schema.js';
import { isOpenApiEnabled, resolveOpenApiSpecPaths } from '../config/schema.js';
import { jsLiteral } from './code-utils.js';

/**
 * 生成 lib/openapi.ts — OpenAPI 实例定义
 *
 * 使用绝对路径解析 spec 文件，避免 SSG 构建时相对路径失效的问题。
 * 支持多文件输入（specs 数组）和单文件（specPath 向后兼容）。
 */
export function generateOpenApiLib(ctx: {
  config: OpenManualConfig;
  projectDir: string;
}): string | null {
  if (!isOpenApiEnabled(ctx.config)) return null;

  // 从配置中解析所有 spec 路径（兼容新旧格式）
  const specPaths = resolveOpenApiSpecPaths(ctx.config);
  if (specPaths.length === 0) return null;

  // 使用绝对路径确保在 .cache/app/ 下构建时能正确找到 spec 文件
  const absolutePaths = specPaths.map((p) => join(ctx.projectDir, p));
  const inputArray = absolutePaths.map((p) => jsLiteral(p)).join(', ');

  return `import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  input: [${inputArray}],
});
`;
}

/**
 * 生成 components/api-page.client.tsx — APIPage 客户端配置
 *
 * createAPIPage 的 client 参数是 APIPageClientOptions（配置对象），
 * 不是 React 组件。使用 defineClientConfig() 创建默认导出。
 */
export function generateApiClientComponent(): string {
  return `'use client';

import { defineClientConfig } from 'fumadocs-openapi/ui/client';

export default defineClientConfig();
`;
}

/**
 * 生成 components/api-page.tsx — APIPage 服务端组件包装器
 */
export function generateApiPageComponent(): string {
  return `import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';
import client from './api-page.client';

export const APIPage = createAPIPage(openapi, {
  client,
});
`;
}
