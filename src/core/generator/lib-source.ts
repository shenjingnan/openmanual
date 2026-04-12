import type { OpenManualConfig } from '../config/schema.js';

export function generateLibSource(ctx: { config: OpenManualConfig }): string {
  const isI18n = ctx.config.i18n?.enabled === true;

  if (isI18n) {
    return `import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/lib/i18n';

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  i18n,
});
`;
  }

  return `import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
});
`;
}
