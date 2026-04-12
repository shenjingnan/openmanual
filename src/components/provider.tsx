'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import SafeSearchDialog from './safe-search-dialog';

interface ProviderProps {
  searchEnabled?: boolean;
  children: ReactNode;
}

export function Provider({ searchEnabled = true, children }: ProviderProps) {
  return (
    <RootProvider
      search={{
        enabled: searchEnabled,
        SearchDialog: SafeSearchDialog,
        options: { type: 'static', api: '/api/search' },
      }}
    >
      {children}
    </RootProvider>
  );
}
