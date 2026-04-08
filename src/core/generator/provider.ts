import type { OpenManualConfig } from '../config/schema.js';

export function generateProvider(ctx: { config: OpenManualConfig }): string {
  const searchEnabled = ctx.config.search?.enabled !== false;

  return `'use client';
import { Provider } from 'openmanual/components/provider';
import type { ReactNode } from 'react';

export function AppProvider({ children }: { children: ReactNode }) {
  return <Provider searchEnabled={${searchEnabled}}>{children}</Provider>;
}
`;
}
