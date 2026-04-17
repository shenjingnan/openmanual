import type { OpenManualConfig } from '../config/schema.js';
import { isI18nEnabled, isOpenApiEnabled } from '../config/schema.js';

export function generateLibSource(ctx: { config: OpenManualConfig }): string {
  const isI18n = isI18nEnabled(ctx.config);
  const isOApi = isOpenApiEnabled(ctx.config);

  // === OpenAPI 启用时：使用 multiple() 合并 docs + openapi 源 ===
  if (isOApi) {
    if (isI18n) {
      // i18n 模式：为每种语言分别生成 locale 前缀的 openapi 文件路径，
      // 确保 dir-parser 能正确将第一段识别为语言代码（而非 "openapi"）
      return `import { docs } from '@/.source/server';
import { loader, multiple } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { openapi } from '@/lib/openapi';
import { i18n } from '@/lib/i18n';

const _omOpenApiFiles = [];
for (const lang of i18n.languages) {
  const result = await openapiSource(openapi, {
    baseDir: \`\${lang}/openapi\`,
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

    return `import { docs } from '@/.source/server';
import { loader, multiple } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { openapi } from '@/lib/openapi';

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: 'openapi',
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
