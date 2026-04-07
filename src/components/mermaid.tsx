'use client';

import { useTheme } from 'next-themes';
import { use, useEffect, useId, useState } from 'react';

interface MermaidAPI {
  initialize(config: {
    startOnLoad?: boolean;
    securityLevel?: string;
    fontFamily?: string;
    themeCSS?: string;
    theme?: string;
  }): void;
  render(
    id: string,
    code: string
  ): Promise<{ svg: string; bindFunctions?: (element: HTMLElement) => void }>;
}

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const mermaid = use(
    cachePromise<MermaidAPI>('mermaid', () => import('mermaid').then((m) => m.default))
  );

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeCSS: 'margin: 1.5rem auto 0;',
    theme: resolvedTheme === 'dark' ? 'dark' : 'default',
  });

  const { svg, bindFunctions } = use(
    cachePromise<{ svg: string; bindFunctions?: (element: HTMLElement) => void }>(
      `${chart}-${resolvedTheme}`,
      () => {
        return mermaid.render(id, chart.replaceAll('\\n', '\n'));
      }
    )
  );

  return (
    <div
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
