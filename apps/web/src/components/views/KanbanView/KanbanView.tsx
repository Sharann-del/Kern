import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import * as Select from '@radix-ui/react-select';
import { Columns2, LayoutGrid, ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { KanbanCardDragPreview } from '@/components/views/KanbanView/KanbanCard';
import { KanbanColumn } from '@/components/views/KanbanView/KanbanColumn';
import { KANBAN_DROP_PREFIX } from '@/components/views/KanbanView/kanbanDnd';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { cn } from '@/lib/utils';
import { useUpdateRow } from '@/hooks/useRows';
import type {
  KernCollection,
  KernField,
  KernRow,
  SelectFieldOptions,
  SelectOption,
  ViewConfig,
} from '@/types/kern';

type ColumnDef = { id: string; option: SelectOption | null };

function belongsToColumn(row: KernRow, slug: string, col: ColumnDef): boolean {
  const v = row.data[slug];
  if (col.option === null) return v == null || v === undefined || v === '';
  return v === col.option.id;
}

function columnIdForRow(row: KernRow, slug: string, columns: ColumnDef[]): string {
  for (const c of columns) {
    if (belongsToColumn(row, slug, c)) return c.id;
  }
  return 'no-status';
}

export type KanbanViewProps = {
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  collectionId: string;
  collection: KernCollection;
  onUpdateViewConfig: (partial: Partial<ViewConfig>) => void;
  onAddField: () => void;
};

export function KanbanView({
  rows,
  fields,
  viewConfig,
  collectionId,
  collection,
  onUpdateViewConfig,
  onAddField,
}: KanbanViewProps) {
  void collection;
  const updateRow = useUpdateRow();
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectFields = useMemo(() => fields.filter((f) => f.type === 'select'), [fields]);

  const groupByField = useMemo(() => {
    const slug = viewConfig.group_by_field;
    if (!slug) return undefined;
    return fields.find((f) => f.slug === slug && f.type === 'select');
  }, [fields, viewConfig.group_by_field]);

  const columns: ColumnDef[] = useMemo(() => {
    if (!groupByField) return [];
    const items = (groupByField.options as SelectFieldOptions | null)?.items ?? [];
    const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
    return [{ id: 'no-status', option: null }, ...ordered.map((o) => ({ id: o.id, option: o }))];
  }, [groupByField]);

  const rowsByColumn = useMemo(() => {
    const map: Record<string, KernRow[]> = {};
    if (!groupByField) return map;
    const slug = groupByField.slug;
    for (const c of columns) map[c.id] = [];
    for (const r of rows) {
      const cid = columnIdForRow(r, slug, columns);
      map[cid]?.push(r);
    }
    for (const c of columns) {
      map[c.id].sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [rows, columns, groupByField]);

  const collapsed = useMemo(() => new Set(viewConfig.kanban_collapsed_columns ?? []), [viewConfig.kanban_collapsed_columns]);

  const toggleCollapse = useCallback(
    (columnId: string) => {
      const next = new Set(collapsed);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      onUpdateViewConfig({ kanban_collapsed_columns: [...next] });
    },
    [collapsed, onUpdateViewConfig]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !groupByField) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    const activeRow = rows.find((r) => r.id === activeIdStr);
    if (!activeRow) return;

    const slug = groupByField.slug;
    const sourceColId = columnIdForRow(activeRow, slug, columns);

    let targetColId: string;
    if (overIdStr.startsWith(KANBAN_DROP_PREFIX)) {
      targetColId = overIdStr.slice(KANBAN_DROP_PREFIX.length);
    } else {
      const overRow = rows.find((r) => r.id === overIdStr);
      if (!overRow) return;
      targetColId = columnIdForRow(overRow, slug, columns);
    }

    const targetCol = columns.find((c) => c.id === targetColId);
    if (!targetCol) return;

    const targetSlugValue = targetCol.option?.id ?? null;
    const curRaw = activeRow.data[slug];
    const curNorm = curRaw == null || curRaw === '' ? null : String(curRaw);
    const tgtNorm = targetCol.option?.id ?? null;
    const dataChanged = curNorm !== tgtNorm;

    const patched = rows.map((r) =>
      r.id === activeIdStr ? { ...r, data: { ...r.data, [slug]: targetSlugValue } } : r
    );

    const targetRowsBefore = patched
      .filter((r) => belongsToColumn(r, slug, targetCol))
      .sort((a, b) => a.sort_order - b.sort_order);
    const targetIds = targetRowsBefore.map((r) => r.id);
    const oldIndex = targetIds.indexOf(activeIdStr);

    let newTargetIds: string[];
    if (overIdStr.startsWith(KANBAN_DROP_PREFIX)) {
      const without = targetIds.filter((id) => id !== activeIdStr);
      newTargetIds = [...without, activeIdStr];
    } else if (targetColId === sourceColId) {
      const overIndex = targetIds.indexOf(overIdStr);
      if (oldIndex < 0 || overIndex < 0) return;
      newTargetIds = arrayMove(targetIds, oldIndex, overIndex);
    } else {
      const without = targetIds.filter((id) => id !== activeIdStr);
      let insertAt = without.indexOf(overIdStr);
      if (insertAt < 0) insertAt = without.length;
      newTargetIds = [...without.slice(0, insertAt), activeIdStr, ...without.slice(insertAt)];
    }

    const idToRow = new Map(patched.map((r) => [r.id, r]));
    const byCol: Record<string, KernRow[]> = {};
    for (const c of columns) {
      byCol[c.id] = patched.filter((r) => belongsToColumn(r, slug, c)).sort((a, b) => a.sort_order - b.sort_order);
    }
    byCol[targetColId] = newTargetIds.map((id) => idToRow.get(id)).filter(Boolean) as KernRow[];

    const flat = columns.flatMap((c) => byCol[c.id]);

    for (let i = 0; i < flat.length; i++) {
      const r = flat[i];
      const prev = rows.find((x) => x.id === r.id);
      if (!prev) continue;
      const orderChanged = prev.sort_order !== i;
      const rowDataChange = r.id === activeIdStr && dataChanged;
      if (!orderChanged && !rowDataChange) continue;
      updateRow.mutate({
        id: r.id,
        collectionId,
        ...(rowDataChange ? { data: { [slug]: targetSlugValue } } : {}),
        ...(orderChanged ? { sortOrder: i } : {}),
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (selectFields.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EmptyState
          icon={Columns2}
          title="Add a Select field to use Kanban view"
          subtitle="Kanban groups rows by a single-select field."
          actionLabel="Add Select field"
          onAction={onAddField}
        />
      </div>
    );
  }

  if (!groupByField) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-auto p-8">
        <LayoutGrid className="text-kern-text-3" size={36} aria-hidden />
        <p className="text-center text-sm font-medium text-kern-text">Select a field to group by</p>
        <Select.Root onValueChange={(fieldSlug) => onUpdateViewConfig({ group_by_field: fieldSlug })}>
          <Select.Trigger
            className={cn(
              'flex h-9 w-full max-w-xs items-center justify-between gap-2 rounded-kern-md border border-kern-border bg-kern-surface px-3 text-sm',
              'outline-none focus:ring-0'
            )}
          >
            <Select.Value placeholder="Choose select field…" className="text-kern-text-2" />
            <ChevronDown size={14} className="text-kern-text-3" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[220] max-h-72 overflow-hidden rounded-kern-md border border-kern-border bg-kern-bg shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                {selectFields.map((f) => (
                  <Select.Item
                    key={f.id}
                    value={f.slug}
                    className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-kern-surface-2"
                  >
                    <FieldTypeIcon type={f.type} size={14} className="text-kern-text-2" />
                    <Select.ItemText>{f.name}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    );
  }

  const activeRow = activeId ? rows.find((r) => r.id === activeId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          key={`${collectionId}-kanban`}
          className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden p-4"
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              option={col.option}
              rows={rowsByColumn[col.id] ?? []}
              fields={fields}
              viewConfig={viewConfig}
              groupByField={groupByField}
              collectionId={collectionId}
              isCollapsed={collapsed.has(col.id)}
              onToggleCollapse={() => toggleCollapse(col.id)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeRow ? (
            <div className="pointer-events-none w-[280px]">
              <KanbanCardDragPreview
                row={activeRow}
                fields={fields}
                viewConfig={viewConfig}
                collectionId={collectionId}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
