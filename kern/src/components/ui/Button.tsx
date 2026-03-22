import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: ReactNode;
  className?: string;
  asChild?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-kern-accent text-white hover:bg-kern-accent/90',
  secondary:
    'bg-kern-surface border border-kern-border text-kern-text hover:bg-kern-surface-2',
  ghost:
    'bg-transparent text-kern-text-2 hover:bg-kern-surface hover:text-kern-text border border-transparent',
  danger:
    'bg-transparent text-kern-danger hover:bg-red-50 border border-transparent hover:border-red-200',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 min-h-[28px] px-2.5',
  md: 'h-8 min-h-[32px] px-3',
  lg: 'h-9 min-h-[36px] px-3.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled,
    className,
    type = 'button',
    asChild = false,
    children,
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  const mergedDisabled = Boolean(disabled || loading);

  return (
    <Comp
      ref={ref as never}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : mergedDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-kern-md text-sm font-medium transition-colors duration-ds-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kern-accent/30',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={14} aria-hidden /> : children}
    </Comp>
  );
});
