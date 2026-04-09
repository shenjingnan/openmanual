import type { OpenManualConfig } from '../config/schema.js';

export function generateGlobalCss(ctx: { config: OpenManualConfig }): string {
  const { config } = ctx;
  const primaryHue = config.theme?.primaryHue ?? 213;
  const darkMode = config.theme?.darkMode ?? true;

  const darkBlock = darkMode
    ? `
.dark {
  --primary-hue: ${primaryHue};

  /* 温暖的深色皮革背景 */
  --color-fd-background: hsl(30, 18%, 10%);
  --color-fd-foreground: hsl(35, 15%, 90%);
  --color-fd-muted: hsl(30, 14%, 14%);
  --color-fd-muted-foreground: hsla(30, 10%, 65%, 0.8);
  --color-fd-popover: hsl(30, 16%, 13%);
  --color-fd-popover-foreground: hsl(35, 12%, 87%);
  --color-fd-card: hsl(30, 15%, 12%);
  --color-fd-card-foreground: hsl(35, 15%, 93%);
  --color-fd-border: hsla(30, 12%, 35%, 25%);
  --color-fd-primary: hsl(35, 20%, 92%);
  --color-fd-primary-foreground: hsl(30, 25%, 10%);
  --color-fd-secondary: hsl(30, 12%, 16%);
  --color-fd-secondary-foreground: hsl(35, 10%, 88%);
  --color-fd-accent: hsla(30, 15%, 30%, 35%);
  --color-fd-accent-foreground: hsl(35, 12%, 88%);
  --color-fd-ring: hsl(30, 30%, 50%);
  --color-fd-overlay: hsla(25, 20%, 5%, 0.5);
}

.dark body {
  background: linear-gradient(hsla(30, 30%, 15%, 0.4), transparent 20rem, transparent);
}
`
    : '';

  return `@import 'tailwindcss';
@import 'fumadocs-ui/style.css';
@custom-variant dark (&:is(.dark, .dark *));

:root {
  --primary-hue: ${primaryHue};

  /* 护眼暖色阅读背景 */
  --color-fd-background: hsl(40, 22%, 96.5%);     /* #faf9f6 纸张白 */
  --color-fd-foreground: hsl(0, 0%, 17.3%);        /* #2c2c2c 柔黑 */
  --color-fd-muted: hsl(40, 15%, 95%);             /* 柔和的暖灰背景 */
  --color-fd-card: hsl(40, 18%, 94%);              /* 卡片背景 */
  --color-fd-popover: hsl(40, 20%, 97.5%);         /* 弹窗背景 */
}
${darkBlock}

/* 代码块：去除 shadow，使用朴素边框；去除 max-height 限制 */
figure.shiki {
  box-shadow: none;
}

figure.shiki > div {
  max-height: none;
}

/* Callout：去除 shadow */
[style*="--callout-color"] {
  box-shadow: none;
}
`;
}
