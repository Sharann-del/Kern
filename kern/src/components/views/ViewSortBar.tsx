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
import * as Select from '@radix-ui/react-select';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, ListOrdered, X } from 'lucide-react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { KernField, SortRule, ViewConfig } from '@/types/kern';

export type ViewSortBarProps = {
  fields: KernField[];
  viewConfig: ViewConfig;
  onUpdateConfig: (partial: Partial<ViewConfig>) => void;
};

function SortableSortRow({
  rule,
  fields,
  onPatch,
  onRemove,
}: {
  rule: SortRule;
  fields: KernField[];
  onPatch: (id: string, patch: Partial<SortRule>) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const field = fields.find((f) => f.slug === rule.field_slug) ?? fields[0];

  return (
    <div ref={setNodeRef} style={style} className="mb-2 flex items-center gap-2">
      <button
        type="button"
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-kern-text-3 active:cursor-grabbing"
        aria-label="Reorder sort"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <Select.Root
        value={rule.field_slug}
        onValueChange={(slug) => onPatch(rule.id, { field_slug: slug })}
      >
        <Select.Trigger
          className={cn(
            'flex h-8 min-w-[120px] flex-1 items-center justify-between gap-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs',
            'outline-none focus:ring-2 focus:ring-kern-accent/30'
          )}
        >
          <span className="flex min-w-0 items-center gap-1 truncate">
            {field ? <FieldTypeIcon type={field.type} size={12} /> : null}
            <Select.Value placeholder="Field" />
          </span>
          <ChevronDown size={12} className="shrink-0 text-kern-text-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-[45] max-h-48 overflow-y-auto rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {fields.map((f) => (
                <Select.Item
                  key={f.id}
                  value={f.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-kern-surface-2"
                >
                  <FieldTypeIcon type={f.type} size={12} />
                  <Select.ItemText>{f.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <div className="flex shrink-0 rounded-kern-md border border-kern-border p-0.5">
        <button
          type="button"
          className={cn(
            'rounded-kern-sm p-1.5 transition-colors',
            rule.direction === 'asc' ? 'bg-kern-accent/15 text-kern-accent' : 'text-kern-text-3'
          )}
          title="A→Z (ascending)"
          aria-label="Sort ascending"
          onClick={() => onPatch(rule.id, { direction: 'asc' })}
        >
          <ArrowUp size={14} />
        </button>
        <button
          type="button"
          className={cn(
            'rounded-kern-sm p-1.5 transition-colors',
            rule.direction === 'desc' ? 'bg-kern-accent/15 text-kern-accent' : 'text-kern-text-3'
          )}
          title="Z→A (descending)"
          aria-label="Sort descending"
          onClick={() => onPatch(rule.id, { direction: 'desc' })}
        >
          <ArrowDown size={14} />
        </button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        aria-label="Remove sort"
        onClick={() => onRemove(rule.id)}
      >
        <X size={14} />
      </Button>
    </div>
  );
}

export function ViewSortBar({ fields, viewConfig, onUpdateConfig }: ViewSortBarProps) {
  const sorts = viewConfig.sorts;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateSorts = (next: SortRule[]) => onUpdateConfig({ sorts: next });

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorts.findIndex((s) => s.id === active.id);
    const newIndex = sorts.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateSorts(arrayMove(sorts, oldIndex, newIndex));
  };

  const patchRule = (id: string, patch: Partial<SortRule>) =>
    updateSorts(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const content = (
    <div className="w-[320px] p-2">
      <div className="mb-2 text-sm font-medium text-kern-text">Sort</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sorts.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="max-h-64 overflow-y-auto">
            {sorts.map((rule) => (
              <SortableSortRow
                key={rule.id}
                rule={rule}
                fields={fields}
                onPatch={patchRule}
                onRemove={(id) => updateSorts(sorts.filter((s) => s.id !== id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2 w-full"
        onClick={() =>
          updateSorts([
            ...sorts,
            {
              id: crypto.randomUUID(),
              field_slug: fields[0]?.slug ?? 'name',
              direction: 'asc',
            },
          ])
        }
      >
        + Add sort
      </Button>
    </div>
  );

  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors',
            sorts.length > 0
              ? 'bg-kern-accent/15 text-kern-accent hover:bg-kern-accent/22'
              : 'bg-kern-surface-2 text-kern-text-2 hover:bg-kern-surface hover:text-kern-text'
          )}
        >
          <ListOrdered size={14} />
          <span>Sort</span>
          {sorts.length > 0 ? (
            <span className="text-[10px] font-medium opacity-80">{sorts.length}</span>
          ) : null}
        </button>
      }
    >
      {content}
    </Popover>
  );
}
