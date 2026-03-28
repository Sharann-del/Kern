import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { LiveSourceSettingsPopover } from '@/components/live-sources/LiveSourceSettingsPopover';
import { Popover } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import type { KernCollection } from '@/types/kern';

export type LiveSourceBadgeProps = {
  collection: KernCollection;
};

export function LiveSourceBadge({ collection }: LiveSourceBadgeProps) {
  const { sync_status: syncStatus, last_synced_at: lastSyncedAt } = collection;

  const trigger = (
    <button
      type="button"
      className={cn(
        'inline-flex w-max max-w-full min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap text-xs outline-none',
        'rounded-lg bg-kern-surface-2 px-3 py-1.5 text-kern-text-3 transition-colors',
        'hover:bg-kern-surface hover:text-kern-text-2 focus-visible:ring-2 focus-visible:ring-kern-accent/35'
      )}
    >
      {syncStatus === 'idle' ? (
        <span className="text-kern-text-3">
          ⟳ Synced{' '}
          {lastSyncedAt
            ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
            : 'never'}
        </span>
      ) : null}
      {syncStatus === 'syncing' ? (
        <span className="flex items-center gap-1 text-amber-600">
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Syncing...
        </span>
      ) : null}
      {syncStatus === 'error' ? (
        <span className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Sync failed
        </span>
      ) : null}
    </button>
  );

  return (
    <Popover trigger={trigger} align="end" side="bottom">
      <LiveSourceSettingsPopover collection={collection} />
    </Popover>
  );
}
