import { Calendar, Check, CircleDot, FileText, Github, Rss, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { GitHubSourceConfig } from '@/components/live-sources/sources/GitHubSourceConfig';
import { GoogleCalendarSourceConfig } from '@/components/live-sources/sources/GoogleCalendarSourceConfig';
import { ICSSourceConfig } from '@/components/live-sources/sources/ICSSourceConfig';
import { LinearSourceConfig } from '@/components/live-sources/sources/LinearSourceConfig';
import { NotionSourceConfig } from '@/components/live-sources/sources/NotionSourceConfig';
import { RSSSourceConfig } from '@/components/live-sources/sources/RSSSourceConfig';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCollection } from '@/hooks/useCollections';
import { slugify } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import type { KernCollection } from '@/types/kern';

type LiveSourceId = 'github' | 'google_calendar' | 'notion' | 'linear' | 'rss' | 'ics' | 'akiflow';

const SOURCES: {
  id: LiveSourceId;
  name: string;
  description: string;
  icon: typeof Github;
}[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Sync pull requests, issues, or repos',
    icon: Github,
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync events from your calendars',
    icon: Calendar,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync pages and databases',
    icon: FileText,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Sync issues and projects',
    icon: CircleDot,
  },
  {
    id: 'rss',
    name: 'RSS Feed',
    description: 'Follow feeds as rows',
    icon: Rss,
  },
  {
    id: 'ics',
    name: 'ICS Calendar',
    description: 'Sync from .ics calendar file',
    icon: Calendar,
  },
  {
    id: 'akiflow',
    name: 'Akiflow',
    description: 'Sync tasks and availability',
    icon: Zap,
  },
];

type Screen = 'create-collection' | 'pick-source' | 'configure';

function isSourceConnected(sourceId: LiveSourceId, col: KernCollection | null | undefined): boolean {
  if (!col?.is_live_source || !col.live_source_type) return false;
  const t = col.live_source_type;
  switch (sourceId) {
    case 'github':
      return t.startsWith('github_');
    case 'google_calendar':
      return t === 'google_calendar_events';
    case 'rss':
      return t === 'rss_feed';
    case 'ics':
      return t === 'ics_calendar';
    case 'notion':
      return t === 'notion_database';
    case 'linear':
      return t === 'linear_issues';
    default:
      return false;
  }
}

export type ConnectLiveSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When omitted, the modal asks for a new collection name first. */
  collectionId?: string;
  /** When connecting from a collection page, pass the collection to show “Connected” on matching sources. */
  collection?: KernCollection | null;
};

export function ConnectLiveSourceModal({
  open,
  onOpenChange,
  collectionId: collectionIdProp,
  collection: collectionProp,
}: ConnectLiveSourceModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const createCollection = useCreateCollection({ navigateOnSuccess: false });

  const [screen, setScreen] = useState<Screen>(() => (collectionIdProp ? 'pick-source' : 'create-collection'));
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(() => collectionIdProp ?? null);
  const [selectedSource, setSelectedSource] = useState<LiveSourceId | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleConnectSuccess = useCallback(() => {
    if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
    if (activeCollectionId) void queryClient.invalidateQueries({ queryKey: ['rows', activeCollectionId] });
    if (activeCollectionId && userId) {
      void queryClient.invalidateQueries({ queryKey: ['collectionById', activeCollectionId, userId] });
    }
    onOpenChange(false);
  }, [activeCollectionId, onOpenChange, queryClient, userId]);

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name || createCollection.isPending) return;
    const slug = slugify(name);
    createCollection.mutate(
      {
        name,
        slug,
        icon: '🐙',
        color: null,
        description: null,
      },
      {
        onSuccess: (created) => {
          setActiveCollectionId(created.id);
          setScreen('pick-source');
        },
      }
    );
  };

  const title =
    screen === 'create-collection'
      ? 'New live source collection'
      : screen === 'pick-source'
        ? 'Connect live source'
        : 'Configure source';

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} maxWidth={560}>
      {screen === 'create-collection' ? (
        <div className="space-y-4">
          <p className="text-sm text-kern-text-2">Create an empty collection, then choose an integration.</p>
          <div>
            <p className="mb-1.5 text-sm font-medium text-kern-text">Collection name</p>
            <Input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="e.g. GitHub PRs" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={createCollection.isPending}
              disabled={!newCollectionName.trim()}
              onClick={handleCreateCollection}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {screen === 'pick-source' ? (
        <div className="space-y-4">
          {!collectionIdProp ? (
            <Button type="button" variant="ghost" size="sm" className="-mt-1" onClick={() => setScreen('create-collection')}>
              ← Change collection
            </Button>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              const connected = collectionIdProp ? isSourceConnected(s.id, collectionProp ?? undefined) : false;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="relative flex flex-col items-start gap-2 rounded-kern-lg border border-kern-border bg-kern-bg p-4 text-left transition hover:border-kern-accent hover:bg-kern-surface-2"
                  onClick={() => {
                    setSelectedSource(s.id);
                    setScreen('configure');
                  }}
                >
                  {connected ? (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3 w-3" aria-hidden />
                      Connected
                    </span>
                  ) : null}
                  <Icon className="h-5 w-5 text-kern-text" aria-hidden />
                  <span className="text-sm font-medium text-kern-text">{s.name}</span>
                  <span className="text-xs text-kern-text-3">{s.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {screen === 'configure' ? (
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mt-1"
            onClick={() => {
              setSelectedSource(null);
              setScreen('pick-source');
            }}
          >
            ← Back
          </Button>
          {selectedSource === 'github' && activeCollectionId ? (
            <GitHubSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource === 'google_calendar' && activeCollectionId ? (
            <GoogleCalendarSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource === 'rss' && activeCollectionId ? (
            <RSSSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource === 'ics' && activeCollectionId ? (
            <ICSSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource === 'notion' && activeCollectionId ? (
            <NotionSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource === 'linear' && activeCollectionId ? (
            <LinearSourceConfig collectionId={activeCollectionId} onSuccess={handleConnectSuccess} />
          ) : null}
          {selectedSource &&
          selectedSource !== 'github' &&
          selectedSource !== 'google_calendar' &&
          selectedSource !== 'rss' &&
          selectedSource !== 'ics' &&
          selectedSource !== 'notion' &&
          selectedSource !== 'linear' ? (
            <p className="text-sm text-kern-text-2">Coming soon</p>
          ) : null}
          {!activeCollectionId &&
          (selectedSource === 'github' ||
            selectedSource === 'google_calendar' ||
            selectedSource === 'rss' ||
            selectedSource === 'ics' ||
            selectedSource === 'notion' ||
            selectedSource === 'linear') ? (
            <p className="text-sm text-kern-text-2">No collection selected.</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
