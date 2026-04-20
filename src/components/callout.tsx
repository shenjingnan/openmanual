'use client';

import {
  Info,
  KeyRound,
  Lightbulb,
  MessageCircleCheck,
  MessageCircleWarning,
  OctagonAlert,
  TriangleAlert,
} from 'lucide-react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CalloutType =
  | 'note'
  | 'info'
  | 'warning'
  | 'tip'
  | 'check'
  | 'danger'
  | 'key'
  | 'warn'
  | 'error'
  | 'success'
  | 'idea';

export interface CalloutContainerProps extends ComponentProps<'div'> {
  /**
   * @defaultValue info
   */
  type?: CalloutType;
  /**
   * Force an icon
   */
  icon?: ReactNode;
}

const iconClass = 'size-5 -me-0.5 text-(--callout-color)';

type ResolvedCalloutType = 'note' | 'info' | 'warning' | 'tip' | 'check' | 'danger' | 'key';

function resolveAlias(type: CalloutType): ResolvedCalloutType {
  const aliases: Partial<Record<CalloutType, ResolvedCalloutType>> = {
    warn: 'warning',
    error: 'danger',
    success: 'check',
    idea: 'tip',
  };
  return aliases[type] ?? (type as ResolvedCalloutType);
}

export function Callout({
  children,
  title,
  ...props
}: {
  title?: ReactNode;
} & Omit<CalloutContainerProps, 'title'>) {
  return (
    <CalloutContainer {...props}>
      {title && <CalloutTitle>{title}</CalloutTitle>}
      <CalloutDescription>{children}</CalloutDescription>
    </CalloutContainer>
  );
}

export function CalloutContainer({
  type: inputType = 'info',
  icon,
  children,
  className,
  style,
  ...props
}: CalloutContainerProps) {
  const type = resolveAlias(inputType);
  return (
    <div
      className={cn(
        'flex gap-2 my-4 rounded-xl border p-3 text-sm text-(--callout-color)',
        className
      )}
      style={
        {
          '--callout-color': `var(--callout-${type}-text)`,
          backgroundColor: `var(--callout-${type}-bg)`,
          borderColor: `var(--callout-${type}-border)`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {icon ??
        {
          note: <MessageCircleWarning className={iconClass} />,
          info: <Info className={iconClass} />,
          warning: <TriangleAlert className={iconClass} />,
          tip: <Lightbulb className={iconClass} />,
          check: <MessageCircleCheck className={iconClass} />,
          danger: <OctagonAlert className={iconClass} />,
          key: <KeyRound className={iconClass} />,
        }[type]}
      <div className="flex flex-col gap-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function CalloutTitle({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('font-medium my-0!', className)} {...props}>
      {children}
    </p>
  );
}

export function CalloutDescription({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <div className={cn('prose-no-margin empty:hidden', className)} {...props}>
      {children}
    </div>
  );
}
