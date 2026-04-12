import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  /** html 标签的 lang 属性，i18n 模式下由路由参数传入 */
  lang?: string;
}

export function AppLayout({ children, lang = 'zh' }: AppLayoutProps) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">{children}</body>
    </html>
  );
}
