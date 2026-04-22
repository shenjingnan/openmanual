import type { OpenManualConfig } from '../config/schema.js';
import { isI18nEnabled, isOpenApiEnabled, isSeparateTabMode } from '../config/schema.js';

export function generateLibSource(ctx: { config: OpenManualConfig }): string {
  const isI18n = isI18nEnabled(ctx.config);
  const isOApi = isOpenApiEnabled(ctx.config);

  // === OpenAPI 启用时：使用 multiple() 合并 docs + openapi 源 ===
  if (isOApi) {
    const separateTab = isSeparateTabMode(ctx.config);
    const groupBy = ctx.config.openapi?.groupBy ?? 'tag';

    if (isI18n) {
      // i18n 模式：根据 separateTab 决定 baseDir
      // - separateTab: 使用 ${lang}/openapi（旧行为，独立 Tab）
      // - !separateTab: 使用 ${lang}/api（混合到文档树中）
      const baseDirStr = separateTab ? 'openapi' : 'api';

      return `import { docs } from 'collections/server';
import { loader, multiple } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { openapi } from '@/lib/openapi';
import { i18n } from '@/lib/i18n';

const _omOpenApiFiles = [];
for (const lang of i18n.languages) {
  const result = await openapiSource(openapi, {
    baseDir: \`\${lang}/${baseDirStr}\`,
${!separateTab ? `    meta: true,\n    groupBy: '${groupBy}',` : ''}
  });
  _omOpenApiFiles.push(...result.files);
}

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: { files: _omOpenApiFiles },
  }),
  {
    baseUrl: '/',
    i18n,
    plugins: [openapiPlugin()],
  },
);
`;
    }

    // 单语言模式
    const baseDir = separateTab ? 'openapi' : 'api';

    return `import { docs } from 'collections/server';
import { loader, multiple } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { openapi } from '@/lib/openapi';

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: '${baseDir}',
${!separateTab ? `      meta: true,\n      groupBy: '${groupBy}',` : ''}
    }),
  }),
  {
    baseUrl: '/',
    plugins: [openapiPlugin()],
  },
);
`;
  }

  // === 无 OpenAPI：保持原有逻辑不变（向后兼容）===
  if (isI18n) {
    return `import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/lib/i18n';

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  i18n,
});
`;
  }

  return `import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
});
`;
}
