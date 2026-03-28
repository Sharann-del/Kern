import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Merged onto `Popover.Content` (e.g. max height + overflow for scrollable panels). */
  contentClassName?: string;
};

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'center',
  side = 'bottom',
  contentClassName,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          className={cn(
            /* Above Modal content (z-[201]) */
            'z-[220] origin-[var(--radix-popover-content-transform-origin)] rounded-kern-lg border border-kern-border bg-kern-bg p-2 shadow-lg outline-none',
            'animate-kern-pop-in',
            contentClassName
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
