'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { config } from '@/openmanual-config';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        enabled: config.search?.enabled !== false,
      }}
    >
      {children}
    </RootProvider>
  );
}
