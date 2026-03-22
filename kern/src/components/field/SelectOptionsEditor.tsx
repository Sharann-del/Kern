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
import { GripVertical, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { SELECT_COLORS } from '@/lib/constants';
import type { SelectOption } from '@/types/kern';

function randomSelectColor(): string {
  return SELECT_COLORS[Math.floor(Math.random() * SELECT_COLORS.length)] ?? '#6366f1';
}

function SelectColorMiniPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          className="h-4 w-4 shrink-0 cursor-pointer rounded-full border border-kern-border"
          style={{ backgroundColor: color }}
          aria-label="Option color"
        />
      }
    >
      <div className="flex w-[180px] flex-wrap gap-1.5 p-1">
        {SELECT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="h-5 w-5 shrink-0 rounded-full border border-kern-border"
            style={{
              backgroundColor: c,
              ...(color === c
                ? { boxShadow: `0 0 0 2px ${c}, 0 0 0 4px var(--kern-bg)` }
                : {}),
            }}
            onClick={() => onChange(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
    </Popover>
  );
}

function SortableOptionRow({
  option,
  onLabelChange,
  onColorChange,
  onRemove,
  autoFocus,
}: {
  option: SelectOption;
  onLabelChange: (id: string, label: string) => void;
  onColorChange: (id: string, color: string) => void;
  onRemove: (id: string) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex h-8 items-center gap-2 rounded-kern-sm px-1"
    >
      <button
        type="button"
        className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center text-kern-text-3 opacity-40 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <SelectColorMiniPicker color={option.color} onChange={(c) => onColorChange(option.id, c)} />
      <input
        ref={inputRef}
        type="text"
        value={option.label}
        onChange={(e) => onLabelChange(option.id, e.target.value)}
        className="min-w-0 flex-1 border border-transparent bg-transparent px-1 py-0.5 text-sm text-kern-text outline-none focus:rounded-kern-sm focus:border-kern-border focus:bg-kern-bg"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove option"
        onClick={() => onRemove(option.id)}
      >
        <X size={14} />
      </Button>
    </div>
  );
}

export type SelectOptionsEditorProps = {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
};

export function SelectOptionsEditor({ options, onChange }: SelectOptionsEditorProps) {
  const [focusNewId, setFocusNewId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateLabel = useCallback(
    (id: string, label: string) => {
      onChange(options.map((o) => (o.id === id ? { ...o, label } : o)));
    },
    [options, onChange]
  );

  const updateColor = useCallback(
    (id: string, color: string) => {
      onChange(options.map((o) => (o.id === id ? { ...o, color } : o)));
    },
    [options, onChange]
  );

  const remove = useCallback(
    (id: string) => {
      onChange(
        options
          .filter((o) => o.id !== id)
          .map((o, i) => ({ ...o, sort_order: i }))
      );
    },
    [options, onChange]
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(options, oldIndex, newIndex).map((o, i) => ({ ...o, sort_order: i }));
    onChange(next);
  };

  const addOption = () => {
    const id = crypto.randomUUID();
    onChange([
      ...options,
      {
        id,
        label: 'Option',
        color: randomSelectColor(),
        sort_order: options.length,
      },
    ]);
    setFocusNewId(id);
  };

  useEffect(() => {
    if (!focusNewId) return;
    const id = focusNewId;
    const t = window.setTimeout(() => {
      if (options.some((o) => o.id === id)) setFocusNewId(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [focusNewId, options]);

  return (
    <div className="flex flex-col gap-1">
      <p className="mb-1 text-xs text-kern-text-2">Options</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {options.map((o) => (
            <SortableOptionRow
              key={o.id}
              option={o}
              onLabelChange={updateLabel}
              onColorChange={updateColor}
              onRemove={remove}
              autoFocus={focusNewId === o.id}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button type="button" variant="secondary" size="sm" className="mt-2 w-full" onClick={addOption}>
        + Add option
      </Button>
    </div>
  );
}
