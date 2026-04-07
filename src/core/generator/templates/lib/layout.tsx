import type { ReactNode } from 'react';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { config } from '@/openmanual-config';

function isImagePath(value: string): boolean {
  return value.startsWith('/') || /\.(svg|png|jpg|jpeg|webp)$/i.test(value);
}

export function baseOptions(): BaseLayoutProps {
  const logo = config.navbar?.logo ?? config.name;
  let title: ReactNode;

  if (typeof logo === 'string' && isImagePath(logo)) {
    title = (
      <>
        <img src={logo} alt={config.name} style={{ height: 28 }} />
      </>
    ) as ReactNode;
  } else if (typeof logo === 'object') {
    const { light, dark } = logo;
    if (light === dark) {
      title = (
        <>
          <img src={light} alt={config.name} style={{ height: 28 }} />
        </>
      ) as ReactNode;
    } else {
      title = (
        <>
          <img src={light} alt={config.name} style={{ height: 28 }} className="dark:hidden" />
          <img src={dark} alt={config.name} style={{ height: 28 }} className="hidden dark:block" />
        </>
      ) as ReactNode;
    }
  } else {
    title = logo;
  }

  return {
    nav: { title },
  };
}
