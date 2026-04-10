'use client';

import Panzoom from '@panzoom/panzoom';
import { LocateFixed, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { use, useCallback, useEffect, useId, useRef, useState } from 'react';

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
  const [dialogState, setDialogState] = useState<'closed' | 'opening' | 'open' | 'closing'>(
    'closed'
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(false);
  const pzRef = useRef<ReturnType<typeof Panzoom> | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

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

  const handleOpen = useCallback(() => {
    if (dialogState === 'opening' || dialogState === 'open') return;
    setDialogState('opening');
  }, [dialogState]);

  const handleClose = useCallback(() => {
    if (dialogState === 'closed' || dialogState === 'closing') return;
    setDialogState('closing');
  }, [dialogState]);

  useEffect(() => {
    if (dialogState === 'opening') {
      // 触发浏览器重排后切换到 open 状态以启动 CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDialogState('open');
        });
      });
    }
  }, [dialogState]);

  useEffect(() => {
    if (dialogState !== 'closing') return;

    const fallbackTimer = setTimeout(() => {
      setDialogState('closed');
    }, 250);

    return () => clearTimeout(fallbackTimer);
  }, [dialogState]);

  const handleOverlayTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== overlayRef.current) return;
      if (dialogState === 'closing') {
        setDialogState('closed');
      }
    },
    [dialogState]
  );

  const handleReset = useCallback(() => {
    pzRef.current?.reset();
  }, []);

  const handleZoomIn = useCallback(() => {
    pzRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    pzRef.current?.zoomOut();
  }, []);

  const handleCenter = useCallback(() => {
    pzRef.current?.reset();
    pzRef.current?.pan(0, 0);
  }, []);

  useEffect(() => {
    if (dialogState === 'closed' || !contentRef.current) return;

    const pz = Panzoom(contentRef.current, {
      maxScale: 5,
      minScale: 0.1,
      contain: 'outside',
    });
    pzRef.current = pz;

    contentRef.current.parentElement?.addEventListener(
      'wheel',
      pz.zoomWithWheel as unknown as EventListener
    );

    return () => {
      pz.destroy();
      contentRef.current?.parentElement?.removeEventListener(
        'wheel',
        pz.zoomWithWheel as unknown as EventListener
      );
    };
  }, [dialogState]);

  useEffect(() => {
    if (dialogState === 'closed') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [dialogState, handleClose]);

  return (
    <>
      <button type="button" className="block w-full cursor-zoom-in" onClick={handleOpen}>
        <div
          className="w-full cursor-zoom-in pointer-events-none"
          ref={(container) => {
            if (container) bindFunctions?.(container);
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </button>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal={dialogState !== 'closed' ? 'true' : undefined}
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ease-out ${
          dialogState === 'closed' ? 'pointer-events-none' : ''
        }`}
        style={{
          backgroundColor: 'var(--color-fd-background)',
          opacity: dialogState === 'closed' || dialogState === 'closing' ? 0 : 1,
          transitionDuration: prefersReducedMotion.current ? '0.01ms' : undefined,
        }}
        onClick={handleClose}
        onTransitionEnd={handleOverlayTransitionEnd}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleClose();
        }}
      >
        <div
          role="document"
          className="relative overflow-hidden w-full h-full"
          style={{
            width: '100%',
            height: '100%',
            transform:
              dialogState === 'closed' || dialogState === 'closing'
                ? 'scale(0.9)'
                : dialogState === 'opening'
                  ? 'scale(0.9)'
                  : 'scale(1)',
            opacity: dialogState === 'closed' || dialogState === 'closing' ? 0 : 1,
            transition:
              dialogState === 'closed'
                ? 'none'
                : `transform ${prefersReducedMotion.current ? '0.01ms' : '200ms'} ease-out, opacity ${prefersReducedMotion.current ? '0.01ms' : '200ms'} ease-out`,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div
            className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg px-2 py-1.5 backdrop-blur-md"
            style={{ backgroundColor: 'var(--color-fd-foreground)' }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              className="mermaid-toolbar-btn inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={{
                color: 'var(--color-fd-background)',
                '--hover-bg': 'var(--color-fd-background)',
                '--hover-color': 'var(--color-fd-foreground)',
              } as React.CSSProperties}
              title="放大"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="mermaid-toolbar-btn inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={{
                color: 'var(--color-fd-background)',
                '--hover-bg': 'var(--color-fd-background)',
                '--hover-color': 'var(--color-fd-foreground)',
              } as React.CSSProperties}
              title="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="mermaid-toolbar-btn inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={{
                color: 'var(--color-fd-background)',
                '--hover-bg': 'var(--color-fd-background)',
                '--hover-color': 'var(--color-fd-foreground)',
              } as React.CSSProperties}
              title="重置缩放"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={handleCenter}
              className="mermaid-toolbar-btn inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={{
                color: 'var(--color-fd-background)',
                '--hover-bg': 'var(--color-fd-background)',
                '--hover-color': 'var(--color-fd-foreground)',
              } as React.CSSProperties}
              title="定位到中心"
            >
              <LocateFixed size={16} />
            </button>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={handleClose}
              className="mermaid-toolbar-btn inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={{
                color: 'var(--color-fd-background)',
                '--hover-bg': 'var(--color-fd-background)',
                '--hover-color': 'var(--color-fd-foreground)',
              } as React.CSSProperties}
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>
          <div
            ref={contentRef}
            role="img"
            className="flex w-full h-full items-center justify-center origin-top-left"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
    </>
  );
}
