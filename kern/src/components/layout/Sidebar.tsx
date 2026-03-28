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
import {
  LAYOUT_SIDEBAR_COLLAPSED_PX,
  LAYOUT_SIDEBAR_EXPANDED_PX,
  LAYOUT_TOPBAR_PX,
} from '@/components/layout/layoutConstants';
import { SidebarCollectionItem } from '@/components/layout/SidebarCollectionItem';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import {
  useCollections,
  useDuplicateCollection,
  useReorderCollections,
} from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection } from '@/types/kern';

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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(collapsed && 'w-full min-w-0 shrink-0 overflow-x-hidden')}
    >
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
  const duplicateCollection = useDuplicateCollection();
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

  const width = sidebarCollapsed ? LAYOUT_SIDEBAR_COLLAPSED_PX : LAYOUT_SIDEBAR_EXPANDED_PX;

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
      if (sidebarCollapsed) {
        return (
          <div className="flex w-full min-w-0 flex-col items-center gap-1.5 py-1" aria-hidden>
            <Skeleton className="h-7 w-7 shrink-0 rounded-[4px]" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-[4px]" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-[4px]" />
          </div>
        );
      }
      return (
        <>
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
        </>
      );
    }
    if (manual.length === 0) {
      if (sidebarCollapsed) {
        return null;
      }
      return <p className="px-3 py-2 text-xs text-[#6B6B64]">No collections yet</p>;
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
              onDuplicate={() => duplicateCollection.mutate({ source: c })}
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
    duplicateCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const liveCollectionsList = useMemo(() => {
    if (isLoading) {
      if (sidebarCollapsed) {
        return (
          <div className="flex w-full min-w-0 flex-col items-center gap-1.5 py-1" aria-hidden>
            <Skeleton className="h-7 w-7 shrink-0 rounded-[4px]" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-[4px]" />
          </div>
        );
      }
      return (
        <>
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
        </>
      );
    }
    if (live.length === 0 && !sidebarCollapsed) {
      return <p className="px-3 py-2 text-xs text-[#6B6B64]">No live sources yet.</p>;
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
          onDuplicate={() => duplicateCollection.mutate({ source: c })}
          onDelete={() => openCollectionDeleteDialog(c)}
        />
      );
    });
  }, [
    isLoading,
    live,
    activeSlug,
    sidebarCollapsed,
    duplicateCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const dashboardClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-[30px] items-center gap-2 rounded-[4px] text-[13px] font-medium transition-[background-color,color] duration-[80ms] ease-in-out',
      sidebarCollapsed
        ? 'w-8 shrink-0 self-center justify-center gap-0 px-0'
        : 'pl-3 pr-2',
      isActive
        ? 'bg-[#353533] text-[#F5F4F0] [&_svg]:text-[#F5F4F0]'
        : 'bg-transparent text-[#A8A89E] [&_svg]:text-[#6B6B64]',
      !isActive &&
        'hover:bg-[#2C2C2A] hover:text-[#F5F4F0] hover:[&_svg]:text-[#A8A89E]'
    );

  const dashboardLink = (
    <NavLink to="/dashboard" className={dashboardClass}>
      <LayoutDashboard size={16} strokeWidth={1.75} className="shrink-0" />
      {!sidebarCollapsed ? <span className="truncate">Dashboard</span> : null}
    </NavLink>
  );

  const inner: ReactNode = (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden select-none">
      <nav className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
        <div
          className={cn(
            'min-w-0',
            sidebarCollapsed ? 'flex flex-col items-stretch gap-0.5 pt-2' : 'pt-1'
          )}
        >
          {sidebarCollapsed ? (
            <Tooltip.Root delayDuration={200}>
              <Tooltip.Trigger asChild>{dashboardLink}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="z-[70] rounded-[4px] border border-[#484845] bg-[#353533] px-2 py-1 text-xs text-[#F5F4F0] shadow-[0_2px_8px_rgba(10,10,8,0.5)]"
                  side="right"
                  sideOffset={8}
                >
                  Dashboard
                  <Tooltip.Arrow className="fill-[#484845]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            dashboardLink
          )}
        </div>

        <div
          className={cn(
            'my-1 h-px min-w-0 shrink-0 bg-[#2A2A28]',
            sidebarCollapsed ? 'mx-2' : 'mx-3'
          )}
        />

        <div
          className={cn(
            'group/sidebar-section min-w-0',
            sidebarCollapsed ? 'flex flex-col items-stretch' : ''
          )}
        >
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between pr-1 pl-3 pt-4 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B6B64]">
                COLLECTIONS
              </span>
              <button
                type="button"
                className={cn(
                  'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent text-[#6B6B64] opacity-0 transition-[opacity,background-color,color] duration-[80ms] ease-in-out',
                  'group-hover/sidebar-section:opacity-100',
                  'hover:bg-[#353533] hover:text-[#A8A89E]'
                )}
                aria-label="New collection"
                onClick={() => openCreateCollectionModal()}
              >
                <Plus size={12} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 justify-center overflow-x-hidden py-1">
              <button
                type="button"
                className={cn(
                  'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent text-[#6B6B64] transition-[background-color,color] duration-[80ms] ease-in-out',
                  'hover:bg-[#353533] hover:text-[#A8A89E]'
                )}
                aria-label="New collection"
                onClick={() => openCreateCollectionModal()}
              >
                <Plus size={12} strokeWidth={2} />
              </button>
            </div>
          )}
          <div
            className={cn(
              'flex min-w-0 flex-col',
              sidebarCollapsed ? 'w-full items-stretch overflow-x-hidden' : ''
            )}
          >
            {manualCollectionsList}
          </div>
        </div>

        <div
          className={cn(
            'my-1 h-px min-w-0 shrink-0 bg-[#2A2A28]',
            sidebarCollapsed ? 'mx-2' : 'mx-3'
          )}
        />

        <Collapsible.Root defaultOpen className="group/live w-full min-w-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between pr-1 pl-3 pt-4 pb-1">
              <Collapsible.Trigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-0 bg-transparent text-left outline-none"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B6B64]">
                    LIVE SOURCES
                  </span>
                  <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-[#6B6B64] transition-transform duration-[80ms] ease-in-out group-data-[state=open]/live:rotate-180"
                  />
                </button>
              </Collapsible.Trigger>
            </div>
          ) : (
            <div className="flex w-full min-w-0 justify-center overflow-x-hidden py-0.5">
              <Collapsible.Trigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border-0 bg-transparent text-[#6B6B64] outline-none transition-[background-color,color] duration-[80ms] ease-in-out hover:bg-[#2C2C2A] hover:text-[#A8A89E]"
                  aria-label="Live sources"
                >
                  <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 transition-transform duration-[80ms] ease-in-out group-data-[state=open]/live:rotate-180"
                  />
                </button>
              </Collapsible.Trigger>
            </div>
          )}
          <Collapsible.Content className="min-w-0 overflow-hidden data-[state=closed]:animate-none">
            <div
              className={cn(
                'flex min-w-0 flex-col pt-0.5',
                sidebarCollapsed ? 'items-stretch overflow-x-hidden' : ''
              )}
            >
              {liveCollectionsList}
            </div>
          </Collapsible.Content>
        </Collapsible.Root>
      </nav>

      <div
        className={cn(
          'mt-auto min-w-0 shrink-0 border-t border-[#2A2A28] py-2',
          sidebarCollapsed ? 'px-0' : 'px-1.5'
        )}
      >
        <button
          type="button"
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-[4px] border-0 bg-transparent text-[12px] text-[#6B6B64] transition-[background-color,color] duration-[80ms] ease-in-out',
            'hover:bg-[#2C2C2A] hover:text-[#A8A89E]',
            sidebarCollapsed
              ? 'mx-auto h-[30px] w-full min-w-0 max-w-full justify-center px-0'
              : 'h-[30px] w-full px-2'
          )}
          onClick={() => openCreateCollectionModal()}
          aria-label="New collection"
        >
          <Plus size={13} strokeWidth={2} className="shrink-0" />
          {!sidebarCollapsed ? <span>New collection</span> : null}
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 z-40 flex flex-col overflow-hidden border-r border-[#2A2A28] bg-[linear-gradient(180deg,#222220_0%,#1E1E1C_100%)]'
      )}
      style={{
        top: LAYOUT_TOPBAR_PX,
        width,
        transition: 'width 150ms ease',
      }}
    >
      <Tooltip.Provider delayDuration={240}>{inner}</Tooltip.Provider>
    </aside>
  );
}
