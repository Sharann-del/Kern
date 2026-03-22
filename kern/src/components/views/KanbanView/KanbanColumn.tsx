import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronLeft, Plus } from 'lucide-react';

import { KanbanCard } from '@/components/views/KanbanView/KanbanCard';
import { kanbanColumnDroppableId } from '@/components/views/KanbanView/kanbanDnd';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useCreateRow } from '@/hooks/useRows';
import type { KernField, KernRow, SelectOption, ViewConfig } from '@/types/kern';

export type KanbanColumnProps = {
  columnId: string;
  option: SelectOption | null;
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  groupByField: KernField;
  collectionId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export function KanbanColumn({
  columnId,
  option,
  rows,
  fields,
  viewConfig,
  groupByField,
  collectionId,
  isCollapsed,
  onToggleCollapse,
}: KanbanColumnProps) {
  const droppableId = kanbanColumnDroppableId(columnId);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const createRow = useCreateRow();
  const openRow = useAppStore((s) => s.openRow);
  const slug = groupByField.slug;
  const label = option?.label ?? `No ${groupByField.name}`;

  const onAdd = () => {
    createRow.mutate(
      { collectionId, data: { [slug]: option?.id ?? null } },
      { onSuccess: (r) => openRow(r.id, collectionId) }
    );
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-10 shrink-0 flex-col rounded-kern-lg border border-kern-border bg-kern-surface py-2 transition-colors hover:bg-kern-surface-2"
        aria-expanded={false}
      >
        <div
          className="flex flex-1 flex-col items-center justify-center gap-1 text-kern-text-2"
          style={{ writingMode: 'vertical-rl' }}
        >
          <ChevronLeft className="shrink-0 rotate-180" size={14} aria-hidden />
          <span className="max-h-[200px] truncate text-xs font-medium">{label}</span>
          <span className="text-xs text-kern-text-3">{rows.length}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-kern-lg border border-kern-border bg-kern-surface">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-kern-border px-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: option?.color ?? '#9ca3af' }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-kern-text">{label}</span>
        <span className="shrink-0 text-xs text-kern-text-3">{rows.length}</span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="shrink-0 rounded-kern-sm p-1 text-kern-text-3 transition-colors hover:bg-kern-surface-2 hover:text-kern-text"
          aria-label="Collapse column"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 pt-2',
            isOver && 'bg-kern-accent/5'
          )}
        >
          {rows.length === 0 ? (
            <div className="flex h-20 items-center justify-center rounded-kern-md border border-dashed border-kern-border text-xs text-kern-text-3">
              Drop cards here
            </div>
          ) : (
            rows.map((r) => (
              <KanbanCard
                key={r.id}
                row={r}
                fields={fields}
                viewConfig={viewConfig}
                collectionId={collectionId}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="shrink-0 border-t border-kern-border p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-1"
          onClick={onAdd}
          disabled={createRow.isPending}
        >
          <Plus size={14} />
          Add card
        </Button>
      </div>
    </div>
  );
}
