import { formatDistanceToNow } from 'date-fns';

import { useCollectionById } from '@/hooks/useCollections';
import { useRowsCreatedTodayCount } from '@/hooks/useRows';

export type CollectionStatsWidgetProps = {
  config: { collection_id: string };
};

export function CollectionStatsWidget({ config }: CollectionStatsWidgetProps) {
  const { data: collection, isLoading } = useCollectionById(config.collection_id);
  const { data: todayCount = 0, isLoading: todayLoading } = useRowsCreatedTodayCount(
    config.collection_id
  );

  if (isLoading || !collection) {
    return <p className="text-xs text-kern-text-3">Loading…</p>;
  }

  const rowCount = collection.row_count ?? 0;
  const updatedLabel = formatDistanceToNow(new Date(collection.updated_at), { addSuffix: true });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {collection.icon ? (
          <span className="text-[28px] leading-none" aria-hidden>
            {collection.icon}
          </span>
        ) : null}
        <span className="text-sm font-medium text-kern-text">{collection.name}</span>
      </div>
      <div>
        <p className="text-4xl font-bold text-kern-text">{rowCount}</p>
        <p className="text-sm text-kern-text-2">rows</p>
      </div>
      <div className="h-px bg-kern-border" />
      <p className="text-xs text-kern-text-2">
        Added today: {todayLoading ? '…' : todayCount}
      </p>
      <p className="text-xs text-kern-text-3">Last updated: {updatedLabel}</p>
    </div>
  );
}
