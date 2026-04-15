/**
 * 生成 components/api-page.tsx — <APIPage> 服务端组件
 */
export function generateAPIPageComponent(): string {
  return `import { openapi } from '@/lib/openapi';
import { createAPIPage } from 'fumadocs-openapi/ui';
import client from './api-page.client';

export const APIPage = createAPIPage(openapi, {
  client,
});
`;
}
