import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { memo, type ReactNode } from 'react';

import { CellRenderer } from '@/components/cells/CellRenderer';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { KernField, KernRow, ViewConfig } from '@/types/kern';

export type KanbanCardProps = {
  row: KernRow;
  fields: KernField[];
  viewConfig: ViewConfig;
  collectionId: string;
  /** When true, the in-list card is hidden while dragging (DragOverlay shows the preview). */
  isDragging?: boolean;
};

function KanbanCardBody({
  row,
  fields,
  viewConfig,
  dragHandle,
  className,
  onOpen,
}: {
  row: KernRow;
  fields: KernField[];
  viewConfig: ViewConfig;
  dragHandle?: ReactNode;
  className?: string;
  onOpen: () => void;
}) {
  const primary = rowPrimaryLabel(row, fields);
  const slugs = (viewConfig.gallery_card_fields ?? []).slice(0, 3);
  const secondaryFields = slugs
    .map((slug) => fields.find((f) => f.slug === slug))
    .filter((f): f is KernField => Boolean(f));

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative rounded-kern-lg border border-kern-border bg-kern-surface-2 p-3 shadow-sm',
        'transition-[box-shadow,background-color,border-color] hover:border-kern-border-2 hover:bg-ds-bg-3 hover:shadow-md',
        className
      )}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {dragHandle}
      <p className="line-clamp-2 pl-6 text-sm font-medium text-kern-text">{primary}</p>
      {secondaryFields.map((f) => (
        <div key={f.id} className="mt-2">
          <div className="text-xs text-kern-text-3">{f.name}</div>
          <div className="text-xs text-kern-text">
            <CellRenderer
              value={row.data[f.slug]}
              field={f}
              row={row}
              rowId={row.id}
              isEditing={false}
              onStartEdit={() => {}}
              onSave={() => {}}
              onCancel={() => {}}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCardComponent({
  row,
  fields,
  viewConfig,
  collectionId,
  isDragging,
}: KanbanCardProps) {
  const openRow = useAppStore((s) => s.openRow);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging: sortableDragging } =
    useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="absolute left-2 top-2 z-[1] flex h-6 w-6 cursor-grab items-center justify-center rounded-kern-sm text-kern-text-3 opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
      aria-label="Drag to reorder"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={14} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn('min-w-0', (isDragging ?? sortableDragging) && 'opacity-0')}>
      <KanbanCardBody
        row={row}
        fields={fields}
        viewConfig={viewConfig}
        dragHandle={handle}
        onOpen={() => openRow(row.id, collectionId)}
      />
    </div>
  );
}

export const KanbanCard = memo(KanbanCardComponent);
KanbanCard.displayName = 'KanbanCard';

export function KanbanCardDragPreview({ row, fields, viewConfig, collectionId }: KanbanCardProps) {
  const openRow = useAppStore((s) => s.openRow);
  return (
    <div className="origin-top-left scale-[1.03] rotate-[1deg] shadow-xl">
      <KanbanCardBody row={row} fields={fields} viewConfig={viewConfig} onOpen={() => openRow(row.id, collectionId)} />
    </div>
  );
}
