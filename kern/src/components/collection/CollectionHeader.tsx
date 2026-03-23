import { useState } from 'react';

import { CollectionActionsMenu } from '@/components/collection/CollectionActionsMenu';
import { CollectionViewTabs } from '@/components/collection/CollectionViewTabs';
import { ConnectLiveSourceModal } from '@/components/live-sources/ConnectLiveSourceModal';
import { LiveSourceBadge } from '@/components/live-sources/LiveSourceBadge';
import { Button } from '@/components/ui/Button';
import { ViewFieldsMenu } from '@/components/views/ViewFieldsMenu';
import { ViewFilterBar } from '@/components/views/ViewFilterBar';
import { ViewOptionsMenu } from '@/components/views/ViewOptionsMenu';
import { ViewSortBar } from '@/components/views/ViewSortBar';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernView, ViewConfig } from '@/types/kern';

export type CollectionHeaderProps = {
  collection: KernCollection;
  fields: KernField[];
  views: KernView[];
  activeView: KernView | null;
  onViewChange: (viewId: string) => void;
  onUpdateViewConfig: (partial: Partial<ViewConfig>) => void;
};

export function CollectionHeader({
  collection,
  fields,
  views,
  activeView,
  onViewChange,
  onUpdateViewConfig,
}: CollectionHeaderProps) {
  const [connectLiveOpen, setConnectLiveOpen] = useState(false);
  const filtersPopoverOpen = useAppStore((s) => s.filtersPopoverOpen);
  const setFiltersPopoverOpen = useAppStore((s) => s.setFiltersPopoverOpen);

  const iconBlock = collection.icon ? (
    <span className="text-2xl leading-none">{collection.icon}</span>
  ) : (
    <span
      className="h-9 w-9 shrink-0 rounded-kern-md border border-kern-border"
      style={{ backgroundColor: collection.color ?? '#888888' }}
      aria-hidden
    />
  );

  return (
    <header className="shrink-0 border-b border-kern-border bg-kern-bg">
      <div className="flex h-12 items-center gap-3 border-b border-kern-surface-2 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {iconBlock}
          <h1 className="truncate text-base font-semibold text-kern-text">{collection.name}</h1>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!collection.is_live_source ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 whitespace-nowrap"
              onClick={() => setConnectLiveOpen(true)}
            >
              Connect live source
            </Button>
          ) : (
            <div className="hidden sm:block">
              <LiveSourceBadge collection={collection} />
            </div>
          )}
          <CollectionActionsMenu
            collection={collection}
            onOpenConnectLiveSource={() => setConnectLiveOpen(true)}
          />
        </div>
      </div>

      <ConnectLiveSourceModal
        key={connectLiveOpen ? `${collection.id}-connect-live-open` : `${collection.id}-connect-live-closed`}
        open={connectLiveOpen}
        onOpenChange={setConnectLiveOpen}
        collectionId={collection.id}
        collection={collection}
      />

      <div className="flex h-10 items-center border-b border-kern-border px-4">
        <CollectionViewTabs
          views={views}
          activeViewId={activeView?.id ?? ''}
          onViewChange={onViewChange}
          collectionId={collection.id}
        />
        {activeView ? (
          <div className="ml-auto flex shrink-0 gap-1">
            <ViewFilterBar
              fields={fields}
              viewConfig={activeView.config}
              onUpdateConfig={onUpdateViewConfig}
              open={filtersPopoverOpen}
              onOpenChange={setFiltersPopoverOpen}
            />
            <ViewSortBar
              fields={fields}
              viewConfig={activeView.config}
              onUpdateConfig={onUpdateViewConfig}
            />
            <ViewFieldsMenu
              collectionId={collection.id}
              fields={fields}
              viewConfig={activeView.config}
              onUpdateConfig={onUpdateViewConfig}
            />
            <ViewOptionsMenu
              activeView={activeView}
              fields={fields}
              onUpdateViewConfig={onUpdateViewConfig}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
