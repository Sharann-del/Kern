import { Calendar, CircleDot, FileText, Github, Rss, Zap } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { GitHubSourceConfig } from '@/components/live-sources/sources/GitHubSourceConfig';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCollection } from '@/hooks/useCollections';
import { slugify } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

type LiveSourceId = 'github' | 'google_calendar' | 'notion' | 'linear' | 'rss' | 'akiflow';

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
    id: 'akiflow',
    name: 'Akiflow',
    description: 'Sync tasks and availability',
    icon: Zap,
  },
];

type Screen = 'create-collection' | 'pick-source' | 'configure';

export type ConnectLiveSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When omitted, the modal asks for a new collection name first. */
  collectionId?: string;
};

export function ConnectLiveSourceModal({ open, onOpenChange, collectionId: collectionIdProp }: ConnectLiveSourceModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const createCollection = useCreateCollection({ navigateOnSuccess: false });

  const [screen, setScreen] = useState<Screen>(() => (collectionIdProp ? 'pick-source' : 'create-collection'));
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(() => collectionIdProp ?? null);
  const [selectedSource, setSelectedSource] = useState<LiveSourceId | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleGithubSuccess = useCallback(() => {
    if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
    if (activeCollectionId) void queryClient.invalidateQueries({ queryKey: ['rows', activeCollectionId] });
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
              return (
                <button
                  key={s.id}
                  type="button"
                  className="flex flex-col items-start gap-2 rounded-kern-lg border border-kern-border bg-kern-bg p-4 text-left transition hover:border-kern-accent hover:bg-kern-surface-2"
                  onClick={() => {
                    setSelectedSource(s.id);
                    setScreen('configure');
                  }}
                >
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
            <GitHubSourceConfig collectionId={activeCollectionId} onSuccess={handleGithubSuccess} />
          ) : (
            <p className="text-sm text-kern-text-2">Coming soon</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
