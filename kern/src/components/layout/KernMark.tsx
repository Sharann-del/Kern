import { cn } from '@/lib/utils';

const sizes = {
  sm: 'h-[18px] w-[18px]',
  md: 'h-[22px] w-[22px]',
  lg: 'h-[26px] w-[26px]',
} as const;

export type KernMarkProps = {
  size?: keyof typeof sizes;
  className?: string;
};

/** Circular favicon tile (matches app icon). */
export function KernMark({ size = 'md', className }: KernMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full bg-kern-accent',
        sizes[size],
        className
      )}
      aria-hidden
    >
      <img src="/favicon.svg" alt="" className="h-full w-full object-cover" />
    </span>
  );
}
