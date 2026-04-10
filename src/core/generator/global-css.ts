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

  /* Callout 类型色 */
  --callout-info-bg: hsl(213, 25%, 16%);
  --callout-info-border: hsl(213, 30%, 30%);
  --callout-info-text: hsl(213, 40%, 72%);
  --callout-warning-bg: hsl(32, 35%, 17%);
  --callout-warning-border: hsl(30, 35%, 30%);
  --callout-warning-text: hsl(35, 45%, 72%);
  --callout-danger-bg: hsl(5, 25%, 17%);
  --callout-danger-border: hsl(5, 30%, 30%);
  --callout-danger-text: hsl(5, 40%, 72%);
  --callout-check-bg: hsl(155, 22%, 16%);
  --callout-check-border: hsl(155, 25%, 28%);
  --callout-check-text: hsl(155, 35%, 68%);
  --callout-tip-bg: hsl(155, 22%, 16%);
  --callout-tip-border: hsl(155, 25%, 28%);
  --callout-tip-text: hsl(155, 35%, 68%);
  --callout-note-bg: hsl(215, 15%, 16%);
  --callout-note-border: hsl(215, 18%, 28%);
  --callout-note-text: hsl(215, 25%, 68%);
  --callout-key-bg: hsl(30, 28%, 17%);
  --callout-key-border: hsl(28, 25%, 30%);
  --callout-key-text: hsl(25, 35%, 68%);
}

.dark body {
  background: linear-gradient(hsla(30, 30%, 15%, 0.4), transparent 20rem, transparent);
}
`
    : '';

  return `@import 'tailwindcss';
@source './node_modules/openmanual/dist/components/**/*.js';
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

  /* Callout 类型色 */
  --callout-info-bg: hsl(210, 35%, 94%);
  --callout-info-border: hsl(212, 40%, 80%);
  --callout-info-text: hsl(213, 45%, 35%);
  --callout-warning-bg: hsl(38, 60%, 93%);
  --callout-warning-border: hsl(36, 55%, 78%);
  --callout-warning-text: hsl(28, 55%, 35%);
  --callout-danger-bg: hsl(0, 50%, 94%);
  --callout-danger-border: hsl(0, 45%, 82%);
  --callout-danger-text: hsl(0, 50%, 38%);
  --callout-check-bg: hsl(150, 35%, 93%);
  --callout-check-border: hsl(152, 35%, 78%);
  --callout-check-text: hsl(155, 40%, 32%);
  --callout-tip-bg: hsl(150, 35%, 93%);
  --callout-tip-border: hsl(152, 35%, 78%);
  --callout-tip-text: hsl(155, 40%, 32%);
  --callout-note-bg: hsl(215, 20%, 94%);
  --callout-note-border: hsl(215, 22%, 82%);
  --callout-note-text: hsl(215, 25%, 40%);
  --callout-key-bg: hsl(30, 55%, 93%);
  --callout-key-border: hsl(28, 50%, 78%);
  --callout-key-text: hsl(25, 50%, 35%);
}
${darkBlock}

/* 代码块：去除 shadow，使用朴素边框；去除 max-height 限制 */
figure.shiki {
  box-shadow: none;
}

figure.shiki > div {
  max-height: none;
}

/* Mermaid 全屏操作栏按钮 hover */
.mermaid-toolbar-btn:hover {
  background-color: var(--hover-bg) !important;
  color: var(--hover-color) !important;
}

.mermaid-toolbar-btn:hover svg {
  color: inherit;
}

/* Callout：去除 shadow */
[style*="--callout-color"] {
  box-shadow: none;
}
`;
}
