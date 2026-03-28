import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, align = 'end', ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        'z-[220] min-w-[160px] origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg outline-none',
        'animate-kern-pop-in',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

type ItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  variant?: 'default' | 'danger';
};

const DropdownMenuItem = forwardRef<ElementRef<typeof DropdownMenuPrimitive.Item>, ItemProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-variant={variant}
      className={cn(
        'flex h-7 min-h-7 cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-0 text-sm leading-none text-kern-text outline-none',
        'data-[highlighted]:bg-kern-surface-2',
        'data-[variant=danger]:text-kern-danger data-[highlighted]:data-[variant=danger]:bg-kern-danger/12',
        className
      )}
      {...props}
    />
  )
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('my-1 border-t border-kern-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1 text-xs font-medium uppercase tracking-widest text-kern-text-3',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
