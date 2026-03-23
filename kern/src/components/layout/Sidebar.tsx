import * as Collapsible from '@radix-ui/react-collapsible';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LayoutDashboard, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { SidebarCollectionItem } from '@/components/layout/SidebarCollectionItem';
import { Button } from '@/components/ui/Button';
import { SkeletonRow } from '@/components/ui/Skeleton';
import {
  useCollections,
  useCreateCollection,
  useReorderCollections,
  type CreateCollectionInput,
} from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection } from '@/types/kern';

function makeDuplicateInput(c: KernCollection, all: KernCollection[]): CreateCollectionInput {
  const name = `${c.name} (copy)`;
  const slugs = new Set(all.map((x) => x.slug));
  let slug = `${c.slug}-copy`;
  let n = 2;
  while (slugs.has(slug)) {
    slug = `${c.slug}-copy-${n}`;
    n += 1;
  }
  return {
    name,
    slug,
    icon: c.icon,
    color: c.color,
    description: c.description,
  };
}

function SortableCollectionRow({
  collection,
  isActive,
  collapsed,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  collection: KernCollection;
  isActive: boolean;
  collapsed: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SidebarCollectionItem
        collection={collection}
        isActive={isActive}
        collapsed={collapsed}
        dragAttributes={attributes}
        handleDragListeners={collapsed ? undefined : listeners}
        linkDragListeners={collapsed ? listeners : undefined}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}

export function Sidebar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('collections-sync-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as { sync_status?: string } | null | undefined;
          const prev = payload.old as { sync_status?: string } | null | undefined;
          if (next?.sync_status !== prev?.sync_status) {
            void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const openCreateCollectionModal = useAppStore((s) => s.openCreateCollectionModal);
  const openCollectionEditModal = useAppStore((s) => s.openCollectionEditModal);
  const openCollectionDeleteDialog = useAppStore((s) => s.openCollectionDeleteDialog);

  const collectionMatch = useMatch('/c/:slug');
  const activeSlug = collectionMatch?.params.slug;

  const { data: collections = [], isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const reorderCollections = useReorderCollections();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { manual, live } = useMemo(() => {
    const manualList = collections.filter((c) => !c.is_live_source);
    const liveList = collections.filter((c) => c.is_live_source);
    return { manual: manualList, live: liveList };
  }, [collections]);

  const width = sidebarCollapsed ? 48 : 240;

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = manual.findIndex((c) => c.id === active.id);
      const newIndex = manual.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const manualReordered = arrayMove(manual, oldIndex, newIndex);
      const liveSorted = [...live].sort((a, b) => a.sort_order - b.sort_order);
      const combined = [...manualReordered, ...liveSorted];
      const updates = combined.map((c, i) => ({ id: c.id, sort_order: i }));
      reorderCollections.mutate(updates);
    },
    [manual, live, reorderCollections]
  );

  const manualCollectionsList = useMemo(() => {
    if (isLoading) {
      return (
        <>
          <SkeletonRow className="mx-2 my-1" />
          <SkeletonRow className="mx-2 my-1" />
          <SkeletonRow className="mx-2 my-1" />
        </>
      );
    }
    if (manual.length === 0) {
      return <p className="px-4 py-2 text-xs text-kern-text-3">No collections yet</p>;
    }
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={manual.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {manual.map((c) => (
            <SortableCollectionRow
              key={c.id}
              collection={c}
              isActive={activeSlug === c.slug}
              collapsed={sidebarCollapsed}
              onEdit={() => openCollectionEditModal(c)}
              onDuplicate={() => createCollection.mutate(makeDuplicateInput(c, collections))}
              onDelete={() => openCollectionDeleteDialog(c)}
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  }, [
    isLoading,
    manual,
    sensors,
    onDragEnd,
    activeSlug,
    sidebarCollapsed,
    collections,
    createCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const liveCollectionsList = useMemo(() => {
    if (isLoading) {
      return (
        <>
          <SkeletonRow className="mx-2 my-1" />
          <SkeletonRow className="mx-2 my-1" />
        </>
      );
    }
    if (live.length === 0 && !sidebarCollapsed) {
      return <p className="px-2 py-2 text-xs text-kern-text-3">No live sources yet.</p>;
    }
    return live.map((c) => {
      const isActive = activeSlug === c.slug;
      return (
        <SidebarCollectionItem
          key={c.id}
          collection={c}
          isActive={isActive}
          collapsed={sidebarCollapsed}
          onEdit={() => openCollectionEditModal(c)}
          onDuplicate={() => createCollection.mutate(makeDuplicateInput(c, collections))}
          onDelete={() => openCollectionDeleteDialog(c)}
        />
      );
    });
  }, [
    isLoading,
    live,
    activeSlug,
    sidebarCollapsed,
    collections,
    createCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const inner: ReactNode = (
    <nav className="flex min-h-full flex-col pb-20">
      <div className={cn('flex flex-col gap-0.5 p-2', sidebarCollapsed && 'items-center')}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-kern-md px-2 py-2 text-sm transition-colors duration-ds-fast',
              sidebarCollapsed && 'justify-center px-0',
              isActive
                ? 'bg-kern-accent/10 font-medium text-kern-accent'
                : 'text-kern-text-2 hover:bg-kern-surface-2 hover:text-kern-text'
            )
          }
        >
          <LayoutDashboard size={18} className="shrink-0" />
          {!sidebarCollapsed ? <span>Dashboard</span> : null}
        </NavLink>
      </div>

      <div className="mx-2 my-2 h-px bg-kern-border" />

      <div className={cn('px-2', sidebarCollapsed && 'px-1')}>
        {!sidebarCollapsed ? (
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-medium uppercase tracking-widest text-kern-text-3">
              COLLECTIONS
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              aria-label="New collection"
              onClick={() => openCreateCollectionModal()}
            >
              <Plus size={16} />
            </Button>
          </div>
        ) : (
          <div className="mb-2 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0"
              aria-label="New collection"
              onClick={() => openCreateCollectionModal()}
            >
              <Plus size={16} />
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-1">{manualCollectionsList}</div>
      </div>

      <div className="mx-2 my-2 h-px bg-kern-border" />

      <div className={cn('px-2', sidebarCollapsed && 'px-1')}>
        <Collapsible.Root defaultOpen={false}>
          <Collapsible.Trigger asChild>
            <button
              type="button"
              className={cn(
                'group flex w-full items-center gap-2 rounded-kern-md py-2 text-left text-[10px] font-medium uppercase tracking-widest text-kern-text-3 outline-none transition-colors hover:text-kern-text-2',
                sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2'
              )}
            >
              {!sidebarCollapsed ? <span>LIVE SOURCES</span> : null}
              <ChevronDown
                size={14}
                className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </button>
          </Collapsible.Trigger>
          <Collapsible.Content className="overflow-hidden">
            <div className="flex flex-col gap-1 pb-2">{liveCollectionsList}</div>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>

      <div
        className={cn(
          'fixed bottom-0 left-0 z-40 border-t border-kern-border bg-kern-surface p-2',
          'transition-[width] duration-200 ease-in-out'
        )}
        style={{ width }}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cn(sidebarCollapsed ? 'h-8 w-8 p-0' : 'w-full')}
          onClick={() => openCreateCollectionModal()}
          aria-label="New collection"
        >
          <Plus size={16} className="shrink-0" />
          {!sidebarCollapsed ? <span className="ml-1">+ New collection</span> : null}
        </Button>
      </div>
    </nav>
  );

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 z-40 overflow-y-auto border-r border-kern-border bg-kern-surface',
        'transition-[width] duration-200 ease-in-out'
      )}
      style={{ top: 48, width }}
    >
      <Tooltip.Provider delayDuration={300}>{inner}</Tooltip.Provider>
    </aside>
  );
}
