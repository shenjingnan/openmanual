'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

interface ProviderProps {
  searchEnabled?: boolean;
  children: ReactNode;
}

export function Provider({ searchEnabled = true, children }: ProviderProps) {
  return (
    <RootProvider
      search={{
        enabled: searchEnabled,
        options: { type: 'static', api: '/api/search' },
      }}
    >
      {children}
    </RootProvider>
  );
}
