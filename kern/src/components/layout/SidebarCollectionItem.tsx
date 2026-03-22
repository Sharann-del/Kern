import * as Tooltip from '@radix-ui/react-tooltip';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { memo, useRef } from 'react';
import { NavLink } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { fetchFieldsForCollection } from '@/hooks/useFields';
import { fetchViewsForCollection } from '@/hooks/useViews';
import { cn } from '@/lib/utils';
import type { KernCollection } from '@/types/kern';

const FALLBACK_COLOR = '#888888';

export type SidebarCollectionItemProps = {
  collection: KernCollection;
  isActive: boolean;
  collapsed: boolean;
  dragAttributes?: DraggableAttributes;
  /** Expanded: grip handle only. Collapsed: omit; pass `linkDragListeners` on the NavLink instead. */
  handleDragListeners?: DraggableSyntheticListeners;
  /** Collapsed: NavLink receives these for dragging. */
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

  const iconNode = collection.icon ? (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none">
      {collection.icon}
    </span>
  ) : (
    <span
      className="h-4 w-4 shrink-0 rounded-kern-sm border border-kern-border"
      style={{ backgroundColor: collection.color ?? FALLBACK_COLOR }}
      aria-hidden
    />
  );

  const linkInner = (
    <>
      {iconNode}
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm">{collection.name}</span>
          {showCount ? (
            <span className="shrink-0 text-xs text-kern-text-3">({rowCount})</span>
          ) : null}
        </>
      ) : null}
    </>
  );

  const rowClass = cn(
    'group relative flex h-8 items-center gap-1 rounded-kern-md px-2',
    isActive ? 'bg-kern-accent/10 text-kern-accent' : 'text-kern-text-2 hover:bg-kern-surface-2'
  );

  const linkClass = ({ isActive: navActive }: { isActive: boolean }) =>
    cn(
      'flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-kern-md py-0.5 pl-1 pr-1',
      navActive || isActive ? 'text-kern-accent' : ''
    );

  const handle = (
    <button
      type="button"
      className={cn(
        'flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded-kern-sm border border-transparent text-kern-text-3 opacity-0 transition-opacity active:cursor-grabbing',
        'group-hover:opacity-40'
      )}
      aria-label="Drag to reorder"
      {...dragAttributes}
      {...handleDragListeners}
    >
      <GripVertical size={14} />
    </button>
  );

  const menu = !collapsed ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Collection actions"
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (collapsed) {
    return (
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger asChild>
          <NavLink
            to={`/c/${collection.slug}`}
            className={({ isActive: navActive }) =>
              cn(
                rowClass,
                'cursor-pointer justify-center px-0',
                navActive || isActive ? 'bg-kern-accent/10 text-kern-accent' : ''
              )
            }
            {...dragAttributes}
            {...linkDragListeners}
            onMouseEnter={onRowMouseEnter}
            onMouseLeave={onRowMouseLeave}
          >
            {linkInner}
          </NavLink>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[70] rounded-kern-md border border-kern-border bg-kern-surface px-2 py-1 text-xs text-kern-text shadow-ds-md"
            sideOffset={6}
          >
            {collection.name}
            <Tooltip.Arrow className="fill-kern-border" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return (
    <div className={rowClass} onMouseEnter={onRowMouseEnter} onMouseLeave={onRowMouseLeave}>
      {handle}
      <NavLink to={`/c/${collection.slug}`} className={linkClass}>
        {linkInner}
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
    a.isActive === b.isActive &&
    a.collapsed === b.collapsed &&
    a.dragAttributes === b.dragAttributes &&
    a.handleDragListeners === b.handleDragListeners &&
    a.linkDragListeners === b.linkDragListeners
  );
}

export const SidebarCollectionItem = memo(SidebarCollectionItemInner, sidebarCollectionItemPropsEqual);
