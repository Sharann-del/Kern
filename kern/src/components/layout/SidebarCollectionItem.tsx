import * as Tooltip from '@radix-ui/react-tooltip';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { memo, useRef } from 'react';
import { NavLink } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { CollectionIconDisplay } from '@/components/collection/CollectionIconDisplay';
import { fetchFieldsForCollection } from '@/hooks/useFields';
import { fetchViewsForCollection } from '@/hooks/useViews';
import { cn } from '@/lib/utils';
import type { KernCollection } from '@/types/kern';

const FALLBACK_COLOR = '#6B6B64';

export type SidebarCollectionItemProps = {
  collection: KernCollection;
  isActive: boolean;
  collapsed: boolean;
  dragAttributes?: DraggableAttributes;
  handleDragListeners?: DraggableSyntheticListeners;
  linkDragListeners?: DraggableSyntheticListeners;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function SidebarCollectionItemInner({
  collection,
  isActive,
  collapsed,
  dragAttributes,
  handleDragListeners,
  linkDragListeners,
  onEdit,
  onDuplicate,
  onDelete,
}: SidebarCollectionItemProps) {
  const queryClient = useQueryClient();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetchCollectionData = () => {
    const id = collection.id;
    void queryClient.prefetchQuery({
      queryKey: ['fields', id],
      queryFn: () => fetchFieldsForCollection(id),
      staleTime: 120_000,
    });
    void queryClient.prefetchQuery({
      queryKey: ['views', id],
      queryFn: () => fetchViewsForCollection(id),
      staleTime: 120_000,
    });
  };

  const onRowMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      prefetchCollectionData();
    }, 200);
  };

  const onRowMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const rowCount = collection.row_count ?? 0;
  const showCount = rowCount > 0;

  const iconNode = (
    <CollectionIconDisplay
      icon={collection.icon}
      color={
        collection.icon ? (collection.color ?? undefined) : (collection.color ?? FALLBACK_COLOR)
      }
      size={13}
    />
  );

  const handle = handleDragListeners ? (
    <button
      type="button"
      className={cn(
        'absolute left-0 top-1/2 z-[2] flex h-[28px] w-7 -translate-y-1/2 cursor-grab items-center justify-center border-0 bg-transparent p-0 text-[#6B6B64] opacity-0 transition-opacity duration-[80ms] ease-in-out active:cursor-grabbing',
        'group-hover:opacity-[0.35]'
      )}
      aria-label="Drag to reorder"
      {...dragAttributes}
      {...handleDragListeners}
    >
      <GripVertical size={12} strokeWidth={2} />
    </button>
  ) : null;

  const menu = !collapsed ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent text-[#6B6B64] opacity-0 transition-[opacity,background-color] duration-[80ms] ease-in-out',
            'group-hover:opacity-100 hover:bg-[#353533] hover:text-[#A8A89E]'
          )}
          aria-label="Collection actions"
        >
          <MoreHorizontal size={13} strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit} className="gap-2 text-[13px]">
          <Pencil size={13} strokeWidth={2} className="shrink-0" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate} className="gap-2 text-[13px]">
          <Copy size={13} strokeWidth={2} className="shrink-0" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={onDelete} className="gap-2 text-[13px]">
          <Trash2 size={13} strokeWidth={2} className="shrink-0" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (collapsed) {
    return (
      <div className="flex w-full min-w-0 shrink-0 justify-center overflow-x-hidden">
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger asChild>
            <NavLink
              to={`/c/${collection.slug}`}
              className={({ isActive: navActive }) =>
                cn(
                  'box-border flex h-7 w-full min-w-0 max-w-full cursor-pointer items-center justify-center overflow-x-hidden rounded-[4px] transition-[background-color] duration-[80ms] ease-in-out',
                  navActive || isActive ? 'bg-[#353533]' : 'bg-transparent hover:bg-[#2C2C2A]'
                )
              }
              {...dragAttributes}
              {...linkDragListeners}
              onMouseEnter={onRowMouseEnter}
              onMouseLeave={onRowMouseLeave}
            >
              <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden leading-none">
                {iconNode}
              </span>
            </NavLink>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-[70] rounded-[4px] border border-[#484845] bg-[#353533] px-2 py-1 text-xs text-[#F5F4F0] shadow-[0_2px_8px_rgba(10,10,8,0.5)]"
              side="right"
              sideOffset={8}
            >
              {collection.name}
              <Tooltip.Arrow className="fill-[#484845]" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative mb-px mx-1 flex h-[28px] cursor-pointer items-center rounded-[4px] pl-2 pr-2 transition-[background-color] duration-[80ms] ease-in-out',
        isActive ? 'bg-[#353533]' : 'bg-transparent hover:bg-[#2C2C2A]'
      )}
      onMouseEnter={onRowMouseEnter}
      onMouseLeave={onRowMouseLeave}
    >
      {handle}
      <NavLink
        to={`/c/${collection.slug}`}
        className="relative flex min-h-0 min-w-0 flex-1 items-center gap-[7px] overflow-hidden"
      >
        {({ isActive: navActive }) => (
          <>
            {iconNode}
            <span
              className={cn(
                'min-w-0 max-w-[130px] flex-1 truncate text-[13px] transition-[color] duration-[80ms] ease-in-out',
                navActive || isActive
                  ? 'font-medium text-[#F5F4F0]'
                  : 'font-normal text-[#A8A89E] group-hover:text-[#F5F4F0]'
              )}
            >
              {collection.name}
            </span>
            {showCount ? (
              <span
                className={cn(
                  'ml-auto shrink-0 font-mono text-[11px] text-[#6B6B64] transition-opacity duration-[80ms] ease-in-out',
                  'opacity-100 group-hover:opacity-0'
                )}
              >
                {rowCount}
              </span>
            ) : null}
          </>
        )}
      </NavLink>
      {menu}
    </div>
  );
}

function sidebarCollectionItemPropsEqual(
  a: SidebarCollectionItemProps,
  b: SidebarCollectionItemProps
): boolean {
  return (
    a.collection.id === b.collection.id &&
    a.collection.name === b.collection.name &&
    a.collection.slug === b.collection.slug &&
    a.collection.icon === b.collection.icon &&
    a.collection.color === b.collection.color &&
    (a.collection.row_count ?? 0) === (b.collection.row_count ?? 0) &&
    a.collection.sync_status === b.collection.sync_status &&
    a.collection.last_synced_at === b.collection.last_synced_at &&
    a.isActive === b.isActive &&
    a.collapsed === b.collapsed &&
    a.dragAttributes === b.dragAttributes &&
    a.handleDragListeners === b.handleDragListeners &&
    a.linkDragListeners === b.linkDragListeners
  );
}

export const SidebarCollectionItem = memo(SidebarCollectionItemInner, sidebarCollectionItemPropsEqual);
