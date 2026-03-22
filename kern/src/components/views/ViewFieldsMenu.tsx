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
import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, Columns2, GripVertical } from 'lucide-react';
import { useMemo } from 'react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Popover } from '@/components/ui/Popover';
import { useReorderFields } from '@/hooks/useFields';
import { cn } from '@/lib/utils';
import type { KernField, ViewConfig } from '@/types/kern';

export type ViewFieldsMenuProps = {
  collectionId: string;
  fields: KernField[];
  viewConfig: ViewConfig;
  onUpdateConfig: (partial: Partial<ViewConfig>) => void;
};

function SortableFieldRow({
  field,
  visible,
  onToggleVisible,
}: {
  field: KernField;
  visible: boolean;
  onToggleVisible: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
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
      className="flex items-center gap-2 rounded-kern-sm px-1 py-1.5 hover:bg-kern-surface-2"
    >
      <button
        type="button"
        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-kern-text-3 active:cursor-grabbing"
        aria-label="Reorder field"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <FieldTypeIcon type={field.type} size={14} className="shrink-0 text-kern-text-2" />
      <span className="min-w-0 flex-1 truncate text-sm text-kern-text">{field.name}</span>
      <Checkbox.Root
        checked={visible}
        onCheckedChange={(c) => onToggleVisible(c === true)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
          'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
        )}
        title={visible ? 'Visible in view' : 'Hidden in view'}
      >
        <Checkbox.Indicator className="text-kern-on-accent">
          <Check size={12} strokeWidth={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>
    </div>
  );
}

export function ViewFieldsMenu({
  collectionId,
  fields,
  viewConfig,
  onUpdateConfig,
}: ViewFieldsMenuProps) {
  const reorderFields = useReorderFields();
  const hidden = viewConfig.hidden_fields;

  const ordered = useMemo(
    () => [...fields].sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((f) => f.id === active.id);
    const newIndex = ordered.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    const updates = next.map((f, i) => ({ id: f.id, sort_order: i }));
    reorderFields.mutate({ collectionId, updates });
  };

  const toggleVisible = (slug: string, visible: boolean) => {
    const set = new Set(hidden);
    if (visible) set.delete(slug);
    else set.add(slug);
    onUpdateConfig({ hidden_fields: [...set] });
  };

  const content = (
    <div className="w-[280px] p-2">
      <p className="mb-2 text-xs font-medium text-kern-text-2">Field visibility & order</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ordered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="max-h-72 overflow-y-auto">
            {ordered.map((f) => (
              <SortableFieldRow
                key={f.id}
                field={f}
                visible={!hidden.includes(f.slug)}
                onToggleVisible={(v) => toggleVisible(f.slug, v)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );

  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-kern-md border border-kern-border bg-kern-surface px-2.5 text-sm text-kern-text-2 transition-colors hover:text-kern-text"
        >
          <Columns2 size={14} />
          <span>Fields</span>
        </button>
      }
    >
      {content}
    </Popover>
  );
}
