import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { useCollectionById } from '@/hooks/useCollections';
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const CLIENT_ID = import.meta.env.VITE_NOTION_CLIENT_ID as string | undefined;

export type NotionDatabaseItem = { id: string; title: string };

export type NotionSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

export function NotionSourceConfig({ collectionId, onSuccess }: NotionSourceConfigProps) {
  const { data: collection, refetch } = useCollectionById(collectionId);
  const [step, setStep] = useState<'connect' | 'pick'>('connect');
  const [databases, setDatabases] = useState<NotionDatabaseItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!collection) return;
    if (collection.live_source_type !== 'notion_database') {
      setStep('connect');
      return;
    }
    const cfg = collection.live_source_config as Record<string, unknown> | null;
    const dbId = cfg && typeof cfg.database_id === 'string' ? cfg.database_id.trim() : '';
    if (dbId) setSelectedId(dbId);
    setStep('pick');
  }, [collection]);

  const onSuccessStable = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data?.provider === 'notion') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_collection_id');
        const list = (e.data?.databases as NotionDatabaseItem[] | undefined) ?? [];
        setDatabases(list);
        setWorkspaceName(typeof e.data?.workspace_name === 'string' ? e.data.workspace_name : null);
        setStep('pick');
        void refetch();
        if (list.length === 0) {
          toast.message('Notion connected', { description: 'No databases found. Share a database with your integration.' });
        } else {
          toast.success('Notion connected — pick a database');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [refetch]);

  const connect = () => {
    if (!CLIENT_ID) {
      toast.error('Missing VITE_NOTION_CLIENT_ID');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_collection_id', collectionId);
    const redirectUri = `${window.location.origin}/oauth/callback/notion`;
    const oauthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    window.open(oauthUrl, 'notion-oauth', 'width=600,height=720');
  };

  const syncDatabase = async () => {
    if (!selectedId) {
      toast.error('Select a database');
      return;
    }
    const picked = databases.find((d) => d.id === selectedId);
    const title = picked?.title?.trim() || collection?.name || 'Notion';

    setSyncing(true);
    try {
      const cfg = (collection?.live_source_config as Record<string, unknown> | null) ?? {};
      const { error: upErr } = await supabase
        .from('collections')
        .update({
          live_source_config: { ...cfg, database_id: selectedId },
          name: title,
          sync_status: 'syncing',
          sync_error_message: null,
        })
        .eq('id', collectionId);

      if (upErr) throw upErr;

      const { error, response } = await invokeAuthedEdgeFunction<unknown>('sync-notion', {
        body: { collection_id: collectionId },
      });

      if (error) {
        const detail = await describeFunctionsInvokeError(error, response);
        throw new Error(detail);
      }

      void refetch();
      toast.success('Notion database synced');
      onSuccessStable();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const showConnect =
    step === 'connect' ||
    (collection?.live_source_type === 'notion_database' &&
      databases.length === 0 &&
      !(collection.live_source_config as Record<string, unknown> | null)?.database_id);

  return (
    <div className="space-y-4">
      {showConnect ? (
        <div className="space-y-3">
          <p className="text-sm text-kern-text-2">
            Connect your Notion workspace. You’ll choose which shared database to sync next.
          </p>
          <Button type="button" variant="primary" className="w-full" onClick={connect}>
            Connect Notion
          </Button>
        </div>
      ) : null}

      {step === 'pick' && (databases.length > 0 || selectedId) ? (
        <div className="space-y-3 border-t border-kern-border pt-4">
          {workspaceName ? (
            <p className="text-xs text-kern-text-3">
              Workspace: <span className="text-kern-text-2">{workspaceName}</span>
            </p>
          ) : null}
          <p className="text-sm font-medium text-kern-text">Database</p>
          {databases.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-kern-md border border-kern-border p-1">
              {databases.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full rounded-kern-sm px-2 py-2 text-left text-sm transition-colors',
                      selectedId === d.id ? 'bg-kern-accent/15 text-kern-text' : 'text-kern-text-2 hover:bg-kern-surface-2'
                    )}
                    onClick={() => setSelectedId(d.id)}
                  >
                    <span className="truncate">{d.title || d.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : selectedId ? (
            <p className="text-sm text-kern-text-2">Using linked database (refresh the picker by reconnecting if needed).</p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            className="w-full"
            loading={syncing}
            disabled={!selectedId || syncing}
            onClick={() => void syncDatabase()}
          >
            Sync this database
          </Button>
        </div>
      ) : null}
    </div>
  );
}
