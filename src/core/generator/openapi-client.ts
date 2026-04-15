/**
 * 生成 components/api-page.client.tsx — 客户端配置（Try It Out 交互）
 *
 * 使用默认配置，generators 由 fumadocs-openapi 内部自动注册。
 */
export function generateOAPIClientComponent(): string {
  return `'use client';
import { defineClientConfig } from 'fumadocs-openapi/ui/client';

export default defineClientConfig({});
`;
}
