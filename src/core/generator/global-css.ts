import type { OpenManualConfig } from '../config/schema.js';

export function generateGlobalCss(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const primaryHue = config.theme?.primaryHue ?? 220;

  return `@import 'tailwindcss';
@import 'fumadocs-ui/style.css';

:root {
  --primary-hue: ${primaryHue};
}
`;
}
