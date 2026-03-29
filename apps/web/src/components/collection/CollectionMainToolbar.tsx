import { Plus, Search, X } from 'lucide-react';
import { useState } from 'react';

import { CollectionActionsMenu } from '@/components/collection/CollectionActionsMenu';
import { ConnectLiveSourceModal } from '@/components/live-sources/ConnectLiveSourceModal';
import { LiveSourceBadge } from '@/components/live-sources/LiveSourceBadge';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Button } from '@/components/ui/Button';
import { Popover } from '@/components/ui/Popover';
import { ViewFieldsMenu } from '@/components/views/ViewFieldsMenu';
import { ViewFilterBar } from '@/components/views/ViewFilterBar';
import { ViewOptionsMenu } from '@/components/views/ViewOptionsMenu';
import { ViewSortBar } from '@/components/views/ViewSortBar';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernView, ViewConfig } from '@/types/kern';

export type CollectionMainToolbarProps = {
  collection: KernCollection;
  collectionSlug: string;
  fields: KernField[];
  activeView: KernView | null;
  onUpdateViewConfig: (partial: Partial<ViewConfig>) => void;
  rowSearchQuery: string;
  onRowSearchChange: (value: string) => void;
  onEditField: (field: KernField) => void;
  onAddField: () => void;
};

export function CollectionMainToolbar({
  collection,
  collectionSlug,
  fields,
  activeView,
  onUpdateViewConfig,
  rowSearchQuery,
  onRowSearchChange,
  onEditField,
  onAddField,
}: CollectionMainToolbarProps) {
  const [connectLiveOpen, setConnectLiveOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const filtersPopoverOpen = useAppStore((s) => s.filtersPopoverOpen);
  const setFiltersPopoverOpen = useAppStore((s) => s.setFiltersPopoverOpen);

  return (
    <>
      <ConnectLiveSourceModal
        key={connectLiveOpen ? `${collection.id}-connect-live-open` : `${collection.id}-connect-live-closed`}
        open={connectLiveOpen}
        onOpenChange={setConnectLiveOpen}
        collectionId={collection.id}
        collection={collection}
      />

      <div className="-mx-3 mb-3 min-w-0 shrink-0 border-b border-[var(--border-subtle)] bg-kern-surface/35 sm:-mx-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-3 sm:px-4">
          {activeView ? (
            <div className="flex h-9 w-full min-w-0 max-w-[260px] items-center gap-2 rounded-lg bg-kern-surface-2 px-3 sm:w-[260px] sm:shrink-0 focus-within:ring-2 focus-within:ring-kern-accent/25">
              <Search size={15} className="shrink-0 text-kern-text-3" aria-hidden />
              <input
                type="search"
                value={rowSearchQuery}
                onChange={(e) => onRowSearchChange(e.target.value)}
                placeholder="Search…"
                className="min-w-0 flex-1 bg-transparent text-sm text-kern-text outline-none placeholder:text-kern-text-3"
                aria-label="Search rows by primary field"
              />
              {rowSearchQuery ? (
                <button
                  type="button"
                  onClick={() => onRowSearchChange('')}
                  className="shrink-0 rounded-md p-1 text-kern-text-3 hover:bg-kern-bg/40 hover:text-kern-text"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}

          {activeView ? (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-1 sm:gap-1.5">
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
                collectionSlug={collectionSlug}
                fields={fields}
                onUpdateViewConfig={onUpdateViewConfig}
              />
            </div>
          ) : null}

          <Popover
            open={fieldsOpen}
            onOpenChange={setFieldsOpen}
            align="center"
            contentClassName="w-[min(92vw,360px)] p-0"
            trigger={
              <button
                type="button"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-kern-surface-2 px-3 text-xs font-semibold uppercase tracking-wide text-kern-text-2 transition-colors hover:bg-kern-surface hover:text-kern-text"
              >
                <Plus size={14} strokeWidth={2} />
                Fields
              </button>
            }
          >
          <div className="max-h-[min(70vh,320px)] overflow-y-auto p-2">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-kern-text-3">
              Collection fields
            </p>
            <div className="flex flex-col gap-1">
              {fields.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-kern-sm px-2 py-2 text-left text-sm text-kern-text transition-colors hover:bg-kern-surface-2"
                  onClick={() => {
                    onEditField(f);
                    setFieldsOpen(false);
                  }}
                >
                  <FieldTypeIcon type={f.type} className="text-kern-text-2" size={14} />
                  <span className="truncate font-medium">{f.name}</span>
                </button>
              ))}
              <button
                type="button"
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-kern-sm bg-kern-accent/10 py-2 text-sm font-medium text-kern-accent transition-colors hover:bg-kern-accent/15"
                onClick={() => {
                  onAddField();
                  setFieldsOpen(false);
                }}
              >
                <Plus size={14} />
                Add field
              </button>
            </div>
          </div>
        </Popover>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            {!collection.is_live_source ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 shrink-0 border-0 bg-kern-surface-2 whitespace-nowrap text-kern-text-2 hover:bg-kern-surface hover:text-kern-text"
                onClick={() => setConnectLiveOpen(true)}
              >
                Connect live
              </Button>
            ) : (
              <div className="hidden min-w-0 shrink-0 sm:block">
                <LiveSourceBadge collection={collection} />
              </div>
            )}
            <CollectionActionsMenu
              collection={collection}
              onOpenConnectLiveSource={() => setConnectLiveOpen(true)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
