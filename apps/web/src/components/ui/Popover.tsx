import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';

import { useRadixDataStateOpen } from '@/hooks/useRadixDataStateOpen';
import { VARIANTS } from '@/lib/animations';
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
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const popoverOpen = useRadixDataStateOpen(contentNode);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          forceMount
          asChild
          align={align}
          side={side}
          sideOffset={6}
        >
          <motion.div
            ref={setContentNode}
            className={cn(
              /* Above Modal content (z-[201]) */
              'z-[220] origin-[var(--radix-popover-content-transform-origin)] rounded-kern-lg border border-kern-border bg-kern-bg p-2 shadow-lg outline-none',
              contentClassName
            )}
            style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
            /* Opacity-only: scale/transform on this ancestor breaks overflow-y scrolling inside (WebKit / Tauri). */
            variants={VARIANTS.fade}
            initial="hidden"
            animate={popoverOpen ? 'visible' : 'hidden'}
          >
            {children}
          </motion.div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
