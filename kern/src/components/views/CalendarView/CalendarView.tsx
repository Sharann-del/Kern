import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import * as Select from '@radix-ui/react-select';
import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { cn } from '@/lib/utils';
import { useCreateRow, useUpdateRow } from '@/hooks/useRows';
import { useUpdateView } from '@/hooks/useViews';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernRow, ViewConfig } from '@/types/kern';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

function dateValueForField(field: KernField, dateStr: string): string {
  if (field.type === 'datetime') return `${dateStr}T00:00:00.000Z`;
  return dateStr;
}

function rowsForDay(rows: KernRow[], slug: string, dateStr: string): KernRow[] {
  return rows.filter((r) => {
    const v = r.data[slug];
    if (v == null) return false;
    return String(v).startsWith(dateStr);
  });
}

type EventPillProps = {
  row: KernRow;
  fields: KernField[];
  collectionId: string;
};

function EventPill({ row, fields, collectionId }: EventPillProps) {
  const openRow = useAppStore((s) => s.openRow);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pill-${row.id}`,
    data: { rowId: row.id },
  });
  const label = rowPrimaryLabel(row, fields);

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-event-pill
      {...listeners}
      {...attributes}
      className={cn(
        'mb-0.5 w-full truncate rounded px-1.5 py-0.5 text-left text-xs',
        'cursor-pointer bg-kern-accent/15 text-kern-accent',
        isDragging && 'opacity-50'
      )}
      onClick={(e) => {
        e.stopPropagation();
        openRow(row.id, collectionId);
      }}
    >
      {label}
    </button>
  );
}

type DayDropZoneProps = {
  day: Date;
  inMonth: boolean;
  isTodayCell: boolean;
  dateStr: string;
  dayRows: KernRow[];
  fields: KernField[];
  collectionId: string;
  onEmptyClick: (dateStr: string) => void;
  children?: React.ReactNode;
  /** Extra classes for the day cell (e.g. week view fills column). */
  cellClassName?: string;
};

function DayDropZone({
  day,
  inMonth,
  isTodayCell,
  dateStr,
  dayRows,
  fields,
  collectionId,
  onEmptyClick,
  children,
  cellClassName,
}: DayDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const visible = dayRows.slice(0, 3);
  const more = dayRows.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      role="presentation"
      className={cn(
        'relative flex min-h-[80px] flex-col border-b border-r border-kern-border p-1',
        cellClassName,
        isOver && 'bg-kern-accent/5 ring-1 ring-inset ring-kern-accent/30'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-event-pill]')) return;
        onEmptyClick(dateStr);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEmptyClick(dateStr);
        }
      }}
    >
      <div className="flex justify-end">
        {isTodayCell ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kern-accent text-xs font-medium text-white">
            {format(day, 'd')}
          </span>
        ) : (
          <span className={cn('text-sm', !inMonth && 'opacity-50 text-kern-text-3')}>{format(day, 'd')}</span>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-0.5">
        {visible.map((row) => (
          <EventPill key={row.id} row={row} fields={fields} collectionId={collectionId} />
        ))}
        {more > 0 ? (
          <button
            type="button"
            data-event-pill
            className="block w-full truncate text-left text-xs text-kern-accent underline"
            onClick={(e) => e.stopPropagation()}
          >
            + {more} more
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function CalendarMonthGrid({
  currentDate,
  rows,
  dateField,
  fields,
  collectionId,
  onEmptyClick,
}: {
  currentDate: Date;
  rows: KernRow[];
  dateField: KernField;
  fields: KernField[];
  collectionId: string;
  onEmptyClick: (dateStr: string) => void;
}) {
  const slug = dateField.slug;
  const firstDayOfMonth = startOfMonth(currentDate);
  const gridStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const today = new Date();

  return (
    <div className="grid grid-cols-7">
      {WEEKDAYS.map((d) => (
        <div key={d} className="border-b border-kern-border py-1 text-center text-xs text-kern-text-3">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const inMonth = isSameMonth(day, currentDate);
        const dayRows = rowsForDay(rows, slug, dateStr);
        return (
          <DayDropZone
            key={dateStr}
            day={day}
            inMonth={inMonth}
            isTodayCell={isSameDay(day, today)}
            dateStr={dateStr}
            dayRows={dayRows}
            fields={fields}
            collectionId={collectionId}
            onEmptyClick={onEmptyClick}
          />
        );
      })}
    </div>
  );
}

function CalendarWeekStrip({
  currentDate,
  rows,
  dateField,
  fields,
  collectionId,
  onEmptyClick,
}: {
  currentDate: Date;
  rows: KernRow[];
  dateField: KernField;
  fields: KernField[];
  collectionId: string;
  onEmptyClick: (dateStr: string) => void;
}) {
  const slug = dateField.slug;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-0 border border-kern-border">
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRows = rowsForDay(rows, slug, dateStr);
        return (
          <div key={dateStr} className="flex min-h-[200px] flex-col border-r border-kern-border last:border-r-0">
            <div className="border-b border-kern-border px-2 py-2 text-center">
              <div className="text-xs text-kern-text-3">{WEEKDAYS[(day.getDay() + 6) % 7]}</div>
              <div className={cn('text-sm font-medium', isSameDay(day, today) && 'text-kern-accent')}>
                {format(day, 'MMM d')}
              </div>
            </div>
            <DayDropZone
              day={day}
              inMonth
              isTodayCell={isSameDay(day, today)}
              dateStr={dateStr}
              dayRows={dayRows}
              fields={fields}
              collectionId={collectionId}
              onEmptyClick={onEmptyClick}
              cellClassName="min-h-[160px] flex-1 border-b-0 border-r-0"
            />
          </div>
        );
      })}
    </div>
  );
}

export type CalendarViewProps = {
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  viewId: string;
  collectionId: string;
  collection: KernCollection;
};

export function CalendarView({
  rows,
  fields,
  viewConfig,
  viewId,
  collectionId,
  collection: _collection,
}: CalendarViewProps) {
  void _collection;
  const openRow = useAppStore((s) => s.openRow);
  const updateView = useUpdateView();
  const createRow = useCreateRow();
  const updateRow = useUpdateRow();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [displayMode, setDisplayMode] = useState<'month' | 'week'>('month');

  const dateFields = useMemo(
    () => fields.filter((f) => f.type === 'date' || f.type === 'datetime'),
    [fields]
  );

  const calendarSlug = viewConfig.calendar_date_field;
  const dateField = calendarSlug ? fields.find((f) => f.slug === calendarSlug) : undefined;
  const resolvedDateField =
    dateField && (dateField.type === 'date' || dateField.type === 'datetime') ? dateField : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onPickDateField = (slug: string) => {
    updateView.mutate({ id: viewId, collectionId, config: { calendar_date_field: slug } });
  };

  const onEmptyClick = useCallback(
    (dateStr: string) => {
      if (!resolvedDateField) return;
      const v = dateValueForField(resolvedDateField, dateStr);
      createRow.mutate(
        { collectionId, data: { [resolvedDateField.slug]: v } },
        {
          onSuccess: (r) => openRow(r.id, collectionId),
        }
      );
    },
    [collectionId, createRow, openRow, resolvedDateField]
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      if (!resolvedDateField) return;
      const { active, over } = e;
      if (!over) return;
      const rowId = active.data.current?.rowId as string | undefined;
      const targetDay = String(over.id);
      if (!rowId || !/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) return;
      const v = dateValueForField(resolvedDateField, targetDay);
      updateRow.mutate({ id: rowId, collectionId, data: { [resolvedDateField.slug]: v } });
    },
    [collectionId, resolvedDateField, updateRow]
  );

  const goPrev = () => {
    setCurrentDate((d) => (displayMode === 'month' ? subMonths(d, 1) : addDays(d, -7)));
  };

  const goNext = () => {
    setCurrentDate((d) => (displayMode === 'month' ? addMonths(d, 1) : addDays(d, 7)));
  };

  const periodLabel = useMemo(() => {
    if (displayMode === 'month') return format(currentDate, 'MMMM yyyy');
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, 'MMM d')}–${format(we, 'd, yyyy')}`;
  }, [currentDate, displayMode]);

  if (dateFields.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title="Add a Date or DateTime field"
        subtitle="Calendar view needs at least one date or date & time field on this collection."
      />
    );
  }

  if (!resolvedDateField) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-sm font-medium text-kern-text">Calendar view needs a date field</p>
        <Select.Root onValueChange={onPickDateField}>
          <Select.Trigger
            className={cn(
              'flex h-10 w-full max-w-xs items-center justify-between gap-2 rounded-kern-md border border-kern-border bg-kern-surface px-3 text-sm',
              'outline-none focus:ring-2 focus:ring-kern-accent/30'
            )}
          >
            <Select.Value placeholder="Choose date field…" />
            <ChevronDown size={16} className="shrink-0 text-kern-text-3" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[60] max-h-72 overflow-hidden rounded-kern-md border border-kern-border bg-kern-bg shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport className="p-1">
                {dateFields.map((f) => (
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex h-10 shrink-0 items-center gap-4">
        <Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0" onClick={goPrev} aria-label="Previous">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="min-w-0 flex-1 text-center text-sm font-medium text-kern-text">{periodLabel}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={goNext} aria-label="Next">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="ml-2 flex rounded-kern-md border border-kern-border p-0.5">
            <button
              type="button"
              onClick={() => setDisplayMode('month')}
              className={cn(
                'rounded-kern-sm px-2.5 py-1 text-xs font-medium',
                displayMode === 'month' ? 'bg-kern-accent text-white' : 'text-kern-text-2'
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('week')}
              className={cn(
                'rounded-kern-sm px-2.5 py-1 text-xs font-medium',
                displayMode === 'week' ? 'bg-kern-accent text-white' : 'text-kern-text-2'
              )}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="min-h-0 flex-1 overflow-auto rounded-kern-lg border border-kern-border bg-kern-bg">
          {displayMode === 'month' ? (
            <CalendarMonthGrid
              currentDate={currentDate}
              rows={rows}
              dateField={resolvedDateField}
              fields={fields}
              collectionId={collectionId}
              onEmptyClick={onEmptyClick}
            />
          ) : (
            <CalendarWeekStrip
              currentDate={currentDate}
              rows={rows}
              dateField={resolvedDateField}
              fields={fields}
              collectionId={collectionId}
              onEmptyClick={onEmptyClick}
            />
          )}
        </div>
      </DndContext>
    </div>
  );
}
