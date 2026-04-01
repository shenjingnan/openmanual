import type { OpenManualConfig } from '../config/schema.js';

export function generateProvider(ctx: { config: OpenManualConfig }): string {
  const searchEnabled = ctx.config.search?.enabled !== false;

  return `'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        enabled: ${searchEnabled},
      }}
    >
      {children}
    </RootProvider>
  );
}
`;
}
