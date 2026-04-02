import type { OpenManualConfig } from '../config/schema.js';

export function generateGlobalCss(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const primaryHue = config.theme?.primaryHue ?? 220;

  return `@import 'tailwindcss';
@import 'fumadocs-ui/style.css';

:root {
  --primary-hue: ${primaryHue};

  /* 护眼暖色阅读背景 */
  --color-fd-background: hsl(40, 22%, 96.5%);     /* #faf9f6 纸张白 */
  --color-fd-foreground: hsl(0, 0%, 17.3%);        /* #2c2c2c 柔黑 */
  --color-fd-muted: hsl(40, 15%, 95%);             /* 柔和的暖灰背景 */
  --color-fd-card: hsl(40, 18%, 94%);              /* 卡片背景 */
  --color-fd-popover: hsl(40, 20%, 97.5%);         /* 弹窗背景 */
}
`;
}
