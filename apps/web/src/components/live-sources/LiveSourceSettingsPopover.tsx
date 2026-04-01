import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { edgeFunctionInvokeHint, isLikelyEdgeFunctionTransportError } from '@/lib/edge-function-help';
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { edgeFunctionForLiveSource } from '@/lib/live-source-sync';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import type { KernCollection, LiveSourceType } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

const SOURCE_LABELS: Partial<Record<LiveSourceType, string>> = {
  github_prs: 'GitHub Pull Requests',
  github_issues: 'GitHub Issues',
  github_repos: 'GitHub Repositories',
  google_calendar_events: 'Google Calendar',
  rss_feed: 'RSS Feed',
  ics_calendar: 'ICS Calendar',
};

function labelForType(t: KernCollection['live_source_type']): string {
  if (!t) return 'Live source';
  return SOURCE_LABELS[t] ?? t.replace(/_/g, ' ');
}

export type LiveSourceSettingsPopoverProps = {
  collection: KernCollection;
};

export function LiveSourceSettingsPopover({ collection }: LiveSourceSettingsPopoverProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    const fn = edgeFunctionForLiveSource(collection.live_source_type);
    if (!fn) {
      toast.error('Sync is not available for this source.');
      return;
    }
    setSyncing(true);
    try {
      const { error, response } = await invokeAuthedEdgeFunction<unknown>(fn, {
        body: { collection_id: collection.id },
      });
      if (error) {
        const msg = await describeFunctionsInvokeError(error, response);
        if (isLikelyEdgeFunctionTransportError(msg)) {
          console.error(edgeFunctionInvokeHint());
          toast.error('Could not reach Edge Function', {
            description: `Serve or deploy ${fn} (see console).`,
          });
        } else {
          toast.error(msg);
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['rows', collection.id] });
      if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      void queryClient.invalidateQueries({ queryKey: ['collection', collection.slug, userId] });
      void queryClient.invalidateQueries({ queryKey: ['collectionById', collection.id, userId] });
      toast.success('Synced');
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (isLikelyEdgeFunctionTransportError(raw)) {
        console.error(edgeFunctionInvokeHint());
        toast.error('Could not reach Edge Function', {
          description: `Serve or deploy ${edgeFunctionForLiveSource(collection.live_source_type) ?? 'sync'} (see console).`,
        });
      } else {
        toast.error(await describeFunctionsInvokeError(e));
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-[220px] space-y-3 p-1">
      <div>
        <p className="text-xs font-medium text-kern-text">{labelForType(collection.live_source_type)}</p>
        <p className="mt-1 text-xs text-kern-text-3">
          {collection.last_synced_at
            ? `Last synced ${formatDistanceToNow(new Date(collection.last_synced_at), { addSuffix: true })}`
            : 'Never synced'}
        </p>
        <p className="text-xs text-kern-text-3">{collection.row_count ?? 0} rows</p>
      </div>
      <Button type="button" variant="secondary" size="sm" className="w-full" loading={syncing} onClick={() => void handleSync()}>
        Sync now
      </Button>
      <Button type="button" variant="ghost" size="sm" className="w-full text-kern-danger" disabled title="Coming soon">
        Disconnect
      </Button>
    </div>
  );
}
