import { formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Database,
  Github,
  ListTodo,
  NotebookPen,
  Rss,
  Workflow,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { useCollectionById } from '@/hooks/useCollections';
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { edgeFunctionForLiveSource } from '@/lib/live-source-sync';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import type { LiveSourceType, SyncStatus } from '@/types/kern';

export type LiveSourceStatusWidgetProps = {
  config: { collection_id: string };
};

function SourceIcon({ type }: { type: LiveSourceType | null }) {
  const common = { size: 28, className: 'shrink-0 text-kern-text-2', 'aria-hidden': true as const };
  switch (type) {
    case 'github_prs':
    case 'github_issues':
    case 'github_repos':
      return <Github {...common} />;
    case 'google_calendar_events':
    case 'apple_calendar_events':
      return <Calendar {...common} />;
    case 'notion_database':
      return <NotebookPen {...common} />;
    case 'linear_issues':
    case 'linear_projects':
      return <Workflow {...common} />;
    case 'rss_feed':
      return <Rss {...common} />;
    case 'akiflow_tasks':
      return <ListTodo {...common} />;
    default:
      return <Database {...common} />;
  }
}

export function LiveSourceStatusWidget({ config }: LiveSourceStatusWidgetProps) {
  const queryClient = useQueryClient();
  const { data: collection, isLoading } = useCollectionById(config.collection_id);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    const fn = edgeFunctionForLiveSource(collection?.live_source_type);
    if (!fn) return;
    setSyncing(true);
    try {
      const { error, response } = await invokeAuthedEdgeFunction<unknown>(fn, {
        body: { collection_id: config.collection_id },
      });
      if (error) {
        toast.error(await describeFunctionsInvokeError(error, response));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['collectionById', config.collection_id] });
      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      await queryClient.invalidateQueries({ queryKey: ['rows', config.collection_id] });
      toast.success('Synced');
    } catch (e) {
      toast.error(await describeFunctionsInvokeError(e));
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading || !collection) {
    return <p className="text-xs text-kern-text-3">Loading…</p>;
  }

  const status = collection.sync_status as SyncStatus;
  const isLive = collection.is_live_source;

  const dotClass =
    status === 'error'
      ? 'bg-kern-danger'
      : status === 'syncing' || syncing
        ? 'animate-pulse bg-amber-500'
        : 'bg-emerald-500';

  const lastSynced =
    collection.last_synced_at != null
      ? formatDistanceToNow(new Date(collection.last_synced_at), { addSuffix: true })
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <SourceIcon type={collection.live_source_type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
              aria-hidden
            />
            <span className="truncate text-sm font-medium text-kern-text">{collection.name}</span>
          </div>
          <p className="mt-1 text-xs text-kern-text-2">
            {lastSynced ? `Last synced: ${lastSynced}` : 'Never synced'}
          </p>
          {status === 'error' && collection.sync_error_message ? (
            <p className="mt-2 text-xs text-kern-danger">{collection.sync_error_message}</p>
          ) : null}
        </div>
      </div>
      {isLive && collection.live_source_type ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={syncing}
          onClick={() => void handleSync()}
        >
          Sync now
        </Button>
      ) : (
        <p className="text-xs text-kern-text-3">This collection is not connected to a live source.</p>
      )}
    </div>
  );
}
