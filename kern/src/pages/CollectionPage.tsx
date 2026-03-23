import { useQueryClient } from '@tanstack/react-query';
import { FolderX, Plus, Table2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { FieldPanel } from '@/components/field/FieldPanel';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { useCollection } from '@/hooks/useCollections';
import { useFields, useSetPrimaryField } from '@/hooks/useFields';
import { CalendarView } from '@/components/views/CalendarView/CalendarView';
import { GalleryView } from '@/components/views/GalleryView/GalleryView';
import { KanbanView } from '@/components/views/KanbanView/KanbanView';
import { ListView } from '@/components/views/ListView/ListView';
import { TableView } from '@/components/views/TableView/TableView';
import { useRows } from '@/hooks/useRows';
import { useCreateView, useUpdateView, useViews } from '@/hooks/useViews';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import type { KernField, ViewConfig } from '@/types/kern';

type FieldPanelState =
  | null
  | { mode: 'create'; insertSortOrder?: number }
  | { mode: 'edit'; field: KernField };

export function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const setActiveCollection = useAppStore((s) => s.setActiveCollection);
  const [panel, setPanel] = useState<FieldPanelState>(null);
  const [newRowCount, setNewRowCount] = useState(0);

  const { data: collection, isLoading, isFetched, isError } = useCollection(slug ?? '');
  const collectionId = collection?.id ?? '';
  const { data: fields = [], isLoading: fieldsLoading } = useFields(collectionId);
  const {
    data: views = [],
    isLoading: viewsLoading,
    isFetched: viewsFetched,
    isFetching: viewsFetching,
  } = useViews(collectionId);

  const createView = useCreateView();
  const updateView = useUpdateView();
  const setPrimaryField = useSetPrimaryField();
  const seedDefaultViewRef = useRef(false);
  const [viewsSeedFailed, setViewsSeedFailed] = useState(false);

  useEffect(() => {
    seedDefaultViewRef.current = false;
    // Reset view-seed error when navigating to another collection.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync UI flag to route/collection scope
    setViewsSeedFailed(false);
  }, [collectionId]);

  useEffect(() => {
    if (views.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear error once views load
      setViewsSeedFailed(false);
    }
  }, [views.length]);

  useEffect(() => {
    if (!collectionId || !viewsFetched || viewsFetching) return;
    if (views.length > 0 || seedDefaultViewRef.current) return;
    if (createView.isPending) return;
    seedDefaultViewRef.current = true;
    createView.mutate(
      { collectionId, type: 'table', name: 'Table' },
      {
        onError: () => {
          seedDefaultViewRef.current = false;
          setViewsSeedFailed(true);
        },
      }
    );
  }, [collectionId, viewsFetched, viewsFetching, views.length, createView]);

  const activeView =
    (() => {
      const param = searchParams.get('view');
      if (param && views.some((v) => v.id === param)) {
        return views.find((v) => v.id === param)!;
      }
      return views[0] ?? null;
    })();

  // When views load, replace stale or missing ?view= with the first view id (replace: true avoids history spam).
  useEffect(() => {
    if (views.length === 0) return;
    const param = searchParams.get('view');
    const valid = Boolean(param && views.some((v) => v.id === param));
    if (!valid) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('view', views[0].id);
          return next;
        },
        { replace: true }
      );
    }
  }, [views, searchParams, setSearchParams]);

  const handleViewChange = (viewId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', viewId);
        return next;
      },
      { replace: true }
    );
  };

  const handleUpdateViewConfig = (partial: Partial<ViewConfig>) => {
    if (!activeView || !collectionId) return;
    updateView.mutate({ id: activeView.id, collectionId, config: partial });
  };

  const { data: rows = [], isLoading: rowsLoading } = useRows(collectionId, activeView?.config, fields);

  useEffect(() => {
    setNewRowCount(0);
  }, [collectionId]);

  useEffect(() => {
    if (!collection?.is_live_source || !collectionId) return;
    const channel = supabase
      .channel(`rows-${collectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rows',
          filter: `collection_id=eq.${collectionId}`,
        },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
          if (payload.eventType === 'INSERT') {
            setNewRowCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [collection?.is_live_source, collectionId, queryClient]);

  useEffect(() => {
    if (newRowCount <= 0) return;
    const t = window.setTimeout(() => setNewRowCount(0), 10_000);
    return () => window.clearTimeout(t);
  }, [newRowCount]);

  useEffect(() => {
    if (slug) setActiveCollection(slug);
  }, [slug, setActiveCollection]);

  useEffect(() => {
    return () => setActiveCollection(null);
  }, [setActiveCollection]);

  if (!slug) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex max-w-2xl flex-col gap-4">
          <Skeleton className="h-10 w-64 rounded-kern-md" />
          <SkeletonText className="max-w-md" />
          <SkeletonText className="max-w-sm" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderX}
          title="Something went wrong"
          subtitle="Could not load this collection."
          actionLabel="Back to dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  if (isFetched && collection === null) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderX}
          title="Collection not found"
          subtitle="It may have been deleted or you may not have access."
          actionLabel="Back to dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  const hasPrimaryField = fields.some((f) => f.is_primary);
  const firstFieldForPrimary = [...fields].sort((a, b) => a.sort_order - b.sort_order)[0];
  const showViewsError =
    viewsFetched &&
    views.length === 0 &&
    !viewsFetching &&
    !createView.isPending &&
    viewsSeedFailed;

  const retrySeedView = () => {
    setViewsSeedFailed(false);
    if (!collectionId) return;
    createView.mutate(
      { collectionId, type: 'table', name: 'Table' },
      {
        onError: () => setViewsSeedFailed(true),
      }
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {viewsLoading && views.length === 0 ? (
        <div className="border-b border-kern-border px-6 py-3">
          <Skeleton className="h-8 w-full max-w-xl rounded-kern-md" />
        </div>
      ) : (
        <CollectionHeader
          collection={collection}
          fields={fields}
          views={views}
          activeView={activeView}
          onViewChange={handleViewChange}
          onUpdateViewConfig={handleUpdateViewConfig}
        />
      )}

      {collection.is_live_source && newRowCount > 0 ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-kern-accent/25 bg-kern-accent/10 px-6 py-2.5 text-sm text-kern-text">
          <button
            type="button"
            className="min-w-0 flex-1 text-left font-medium hover:underline"
            onClick={() => {
              setNewRowCount(0);
              void queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {newRowCount} new row{newRowCount === 1 ? '' : 's'} synced — Click to refresh
          </button>
          <button
            type="button"
            className="shrink-0 rounded-kern-sm p-1 text-kern-text-2 hover:bg-kern-surface-2 hover:text-kern-text"
            aria-label="Dismiss"
            onClick={() => setNewRowCount(0)}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <ErrorBoundary>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
          {!hasPrimaryField && firstFieldForPrimary ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-kern-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-kern-text">
              <span>
                This collection has no primary field. Mark a field as primary to fix this.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={setPrimaryField.isPending}
                  onClick={() =>
                    setPrimaryField.mutate({
                      collectionId: collection.id,
                      fieldId: firstFieldForPrimary.id,
                    })
                  }
                >
                  Mark &quot;{firstFieldForPrimary.name}&quot; as primary
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanel({ mode: 'edit', field: firstFieldForPrimary })}
                >
                  Field settings
                </Button>
              </div>
            </div>
          ) : null}

        <section className="shrink-0">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-kern-text-3">
            Fields
          </h2>
          {fieldsLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36 rounded-kern-md" />
              <Skeleton className="h-10 w-36 rounded-kern-md" />
              <Skeleton className="h-10 w-36 rounded-kern-md" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-kern-lg border border-kern-border">
              <div className="flex min-h-11 min-w-0 items-stretch divide-x divide-kern-border bg-kern-surface">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="flex min-w-[148px] shrink-0 items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-kern-surface-2"
                    onClick={() => setPanel({ mode: 'edit', field: f })}
                  >
                    <FieldTypeIcon type={f.type} className="text-kern-text-2" />
                    <span className="truncate font-medium text-kern-text">{f.name}</span>
                  </button>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="min-w-[132px] shrink-0 rounded-none border-0 shadow-none"
                  onClick={() => setPanel({ mode: 'create' })}
                >
                  <Plus size={16} className="shrink-0" />
                  <span className="ml-1">Add field</span>
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 flex min-h-[280px] flex-1 flex-col overflow-hidden">
          <h2 className="mb-2 shrink-0 text-xs font-medium uppercase tracking-widest text-kern-text-3">
            Data
          </h2>
          {showViewsError ? (
            <EmptyState
              icon={Table2}
              title="Could not load views"
              subtitle="We couldn’t create a default table view. Check your connection and try again."
              actionLabel="Try again"
              onAction={retrySeedView}
            />
          ) : fieldsLoading || rowsLoading || (views.length === 0 && createView.isPending) ? (
            <Skeleton className="min-h-[280px] w-full flex-1 rounded-kern-lg" />
          ) : activeView?.type === 'table' && activeView ? (
            <TableView
              rows={rows}
              fields={fields}
              viewConfig={activeView.config}
              viewId={activeView.id}
              collectionId={collection.id}
              collection={collection}
              onEditField={(field) => setPanel({ mode: 'edit', field })}
              onAddField={() => setPanel({ mode: 'create' })}
              onAddFieldBefore={(field) => setPanel({ mode: 'create', insertSortOrder: field.sort_order })}
              onAddFieldAfter={(field) =>
                setPanel({ mode: 'create', insertSortOrder: field.sort_order + 1 })
              }
            />
          ) : activeView?.type === 'kanban' && activeView ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-kern-lg border border-kern-border bg-kern-bg">
              <KanbanView
                rows={rows}
                fields={fields}
                viewConfig={activeView.config}
                collectionId={collection.id}
                collection={collection}
                onUpdateViewConfig={handleUpdateViewConfig}
                onAddField={() => setPanel({ mode: 'create' })}
              />
            </div>
          ) : activeView?.type === 'calendar' && activeView ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-kern-lg border border-kern-border bg-kern-bg p-4">
              <CalendarView
                rows={rows}
                fields={fields}
                viewConfig={activeView.config}
                viewId={activeView.id}
                collectionId={collection.id}
                collection={collection}
              />
            </div>
          ) : activeView?.type === 'gallery' && activeView ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <GalleryView
                rows={rows}
                fields={fields}
                viewConfig={activeView.config}
                collectionId={collection.id}
                collection={collection}
              />
            </div>
          ) : activeView?.type === 'list' && activeView ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <ListView
                rows={rows}
                fields={fields}
                viewConfig={activeView.config}
                collectionId={collection.id}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-kern-lg border border-dashed border-kern-border py-16 text-sm text-kern-text-3">
              This view type is not implemented yet.
            </div>
          )}
        </section>
        </div>
      </ErrorBoundary>

      {panel ? (
        <FieldPanel
          key={panel.mode === 'create' ? 'create' : panel.field.id}
          mode={panel.mode}
          collectionId={collection.id}
          field={panel.mode === 'edit' ? panel.field : undefined}
          createInsertSortOrder={panel.mode === 'create' ? panel.insertSortOrder : undefined}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </div>
  );
}
