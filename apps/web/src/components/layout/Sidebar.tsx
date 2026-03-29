import * as Collapsible from '@radix-ui/react-collapsible';
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
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { LAYOUT_SIDEBAR_EXPANDED_PX, LAYOUT_SIDEBAR_TRANSITION } from '@/components/layout/layoutConstants';
import { SidebarCollectionItem } from '@/components/layout/SidebarCollectionItem';
import { SkeletonRow } from '@/components/ui/Skeleton';
import {
  useCollections,
  useDuplicateCollection,
  useReorderCollections,
} from '@/hooks/useCollections';
import { motionTransitionCustom, shouldAnimate, TRANSITIONS, VARIANTS } from '@/lib/animations';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection } from '@/types/kern';

function SortableCollectionRow({
  collection,
  isActive,
  listStaggerDelaySec,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  collection: KernCollection;
  isActive: boolean;
  /** Opacity stagger (outer node keeps dnd-kit transform). */
  listStaggerDelaySec: number;
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
      <motion.div
        className="min-w-0"
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={{
          opacity: 1,
          transition: motionTransitionCustom({
            ...TRANSITIONS.default,
            delay: shouldAnimate ? listStaggerDelaySec : 0,
          }),
        }}
      >
        <SidebarCollectionItem
          collection={collection}
          isActive={isActive}
          collapsed={false}
          dragAttributes={attributes}
          handleDragListeners={listeners}
          linkDragListeners={undefined}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </motion.div>
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
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
        </>
      );
    }
    if (manual.length === 0) {
      return <p className="px-3 py-2 text-xs text-[#6B6B64]">No collections yet</p>;
    }
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={manual.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {manual.map((c, index) => (
            <SortableCollectionRow
              key={c.id}
              collection={c}
              isActive={activeSlug === c.slug}
              listStaggerDelaySec={index * 0.035}
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
    duplicateCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const liveCollectionsList = useMemo(() => {
    if (isLoading) {
      return (
        <>
          <SkeletonRow className="my-0.5" />
          <SkeletonRow className="my-0.5" />
        </>
      );
    }
    if (live.length === 0) {
      return <p className="px-3 py-2 text-xs text-[#6B6B64]">No live sources yet.</p>;
    }
    return (
      <motion.div
        className="flex min-w-0 flex-col"
        variants={VARIANTS.stagger}
        initial="hidden"
        animate="visible"
      >
        {live.map((c) => {
          const isActive = activeSlug === c.slug;
          return (
            <motion.div key={c.id} className="min-w-0" variants={VARIANTS.sidebarStaggerChild}>
              <SidebarCollectionItem
                collection={c}
                isActive={isActive}
                collapsed={false}
                onEdit={() => openCollectionEditModal(c)}
                onDuplicate={() => duplicateCollection.mutate({ source: c })}
                onDelete={() => openCollectionDeleteDialog(c)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    );
  }, [
    isLoading,
    live,
    activeSlug,
    duplicateCollection,
    openCollectionEditModal,
    openCollectionDeleteDialog,
  ]);

  const dashboardClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-[30px] min-w-0 w-full items-center gap-2 rounded-[4px] pl-2 pr-2 text-[13px] font-medium transition-[background-color,color] duration-[80ms] ease-in-out',
      isActive
        ? 'bg-[#353533] text-[#F5F4F0] [&_svg]:text-[#F5F4F0]'
        : 'bg-transparent text-[#A8A89E] [&_svg]:text-[#6B6B64]',
      !isActive &&
        'hover:bg-[#2C2C2A] hover:text-[#F5F4F0] hover:[&_svg]:text-[#A8A89E]'
    );

  const dashboardLink = (
    <NavLink to="/dashboard" className={dashboardClass}>
      <LayoutDashboard size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="truncate">Dashboard</span>
    </NavLink>
  );

  const inner: ReactNode = (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden select-none">
      <nav className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-2">
        <div className="min-w-0 pt-3">
          <div className="min-w-0 px-2.5">{dashboardLink}</div>
        </div>

        <div className="my-1 mx-3 h-px min-w-0 shrink-0 bg-[#2A2A28]" />

        <div className="group/sidebar-section min-w-0">
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
          <div className="flex min-w-0 flex-col">{manualCollectionsList}</div>
        </div>

        <div className="my-1 mx-3 h-px min-w-0 shrink-0 bg-[#2A2A28]" />

        <Collapsible.Root defaultOpen className="group/live w-full min-w-0">
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
          <Collapsible.Content className="min-w-0 overflow-hidden data-[state=closed]:animate-none">
            <div className="flex min-w-0 flex-col pt-0.5">{liveCollectionsList}</div>
          </Collapsible.Content>
        </Collapsible.Root>
      </nav>

      <div className="mt-auto min-w-0 shrink-0 border-t border-[#2A2A28] px-1.5 py-2">
        <button
          type="button"
          className={cn(
            'flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-[4px] border-0 bg-transparent px-2 text-[12px] text-[#6B6B64] transition-[background-color,color] duration-[80ms] ease-in-out',
            'hover:bg-[#2C2C2A] hover:text-[#A8A89E]'
          )}
          onClick={() => openCreateCollectionModal()}
          aria-label="New collection"
        >
          <Plus size={13} strokeWidth={2} className="shrink-0" />
          <span>New collection</span>
        </button>
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        'flex h-full min-w-0 shrink-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#222220_0%,#1E1E1C_100%)] motion-reduce:!transition-none',
        sidebarCollapsed ? 'border-r-0' : 'border-r border-[#2A2A28]',
        sidebarCollapsed && 'pointer-events-none'
      )}
      style={{
        width: sidebarCollapsed ? 0 : LAYOUT_SIDEBAR_EXPANDED_PX,
        transition: `width ${LAYOUT_SIDEBAR_TRANSITION}`,
      }}
    >
      <div className="flex h-full min-h-0 w-[220px] min-w-[220px] flex-col">
        {inner}
      </div>
    </aside>
  );
}
