import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type KbdProps = {
  children: ReactNode;
  className?: string;
};

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex min-h-[22px] items-center rounded-kern-sm border border-kern-border bg-kern-surface px-1.5 font-mono text-[10px] font-medium text-kern-text-3',
        className
      )}
    >
      {children}
    </kbd>
  );
}
