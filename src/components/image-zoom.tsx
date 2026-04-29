'use client';

import Image from 'next/image';
import Panzoom from '@panzoom/panzoom';
import { LocateFixed, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { StaticImageData } from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface ImageZoomProps {
  src: string | StaticImageData;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  [key: string]: unknown;
}

/**
 * 从 MDX 传入的 src 中提取字符串 URL。
 * fumadocs-mdx 处理图片时，src 可能是 Next.js 的 StaticImageData 对象
 *（如 { src: '/_next/static/media/xxx.png', width: ..., height: ... }），
 * 而非纯字符串。原生 <img> 标签无法处理对象类型的 src。
 */
function resolveSrc(src: string | StaticImageData): string {
  if (typeof src === 'string') return src;
  return src.src;
}

export function ImageZoom({ src, alt }: ImageZoomProps) {
  const resolvedSrc = resolveSrc(src);
  const [dialogState, setDialogState] = useState<'closed' | 'opening' | 'open' | 'closing'>(
    'closed'
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(false);
  const pzRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

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

  // 从 StaticImageData 中提取尺寸（如果可用）
  const imgWidth = typeof src === 'object' && 'width' in src ? (src as StaticImageData).width : undefined;
  const imgHeight = typeof src === 'object' && 'height' in src ? (src as StaticImageData).height : undefined;

  return (
    <>
      <button type="button" className="block w-full cursor-zoom-in" onClick={handleOpen}>
        {imgWidth && imgHeight ? (
          <Image
            src={src}
            alt={alt}
            width={imgWidth}
            height={imgHeight}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
            className="rounded-lg w-full h-auto"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedSrc} alt={alt} className="rounded-lg w-full h-auto" />
        )}
      </button>
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal={dialogState !== 'closed' ? 'true' : undefined}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ease-out',
          dialogState === 'closed' && 'pointer-events-none'
        )}
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
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={
                {
                  color: 'var(--color-fd-background)',
                  '--hover-bg': 'var(--color-fd-background)',
                  '--hover-color': 'var(--color-fd-foreground)',
                } as React.CSSProperties
              }
              title="放大"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={
                {
                  color: 'var(--color-fd-background)',
                  '--hover-bg': 'var(--color-fd-background)',
                  '--hover-color': 'var(--color-fd-foreground)',
                } as React.CSSProperties
              }
              title="缩小"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={
                {
                  color: 'var(--color-fd-background)',
                  '--hover-bg': 'var(--color-fd-background)',
                  '--hover-color': 'var(--color-fd-foreground)',
                } as React.CSSProperties
              }
              title="重置缩放"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={handleCenter}
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={
                {
                  color: 'var(--color-fd-background)',
                  '--hover-bg': 'var(--color-fd-background)',
                  '--hover-color': 'var(--color-fd-foreground)',
                } as React.CSSProperties
              }
              title="定位到中心"
            >
              <LocateFixed size={16} />
            </button>
            <div className="mx-1 h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer"
              style={
                {
                  color: 'var(--color-fd-background)',
                  '--hover-bg': 'var(--color-fd-background)',
                  '--hover-color': 'var(--color-fd-foreground)',
                } as React.CSSProperties
              }
              title="关闭"
            >
              <X size={16} />
            </button>
          </div>
          <div
            ref={contentRef}
            role="img"
            aria-label={alt}
            className="flex w-full h-full items-center justify-center origin-top-left relative"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={resolvedSrc}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
