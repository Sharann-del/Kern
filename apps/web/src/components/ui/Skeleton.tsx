import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded bg-kern-surface-2', className)}
      {...props}
    />
  );
}

export function SkeletonText({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} {...props} />;
}

export function SkeletonRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn('h-9 w-full rounded-kern-md', className)} {...props} />
  );
}
