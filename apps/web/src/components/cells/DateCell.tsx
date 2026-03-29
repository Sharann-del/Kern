import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isTomorrow,
  isYesterday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CellComponentProps } from '@/components/cells/types';
import { Popover } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDateValue(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

function DateOnlyPicker({
  d,
  label,
  onSave,
  onCancel,
}: {
  d: Date | null;
  label: string;
  onSave: (v: unknown) => void;
  onCancel: () => void;
}) {
  const [cursor, setCursor] = useState(() => d ?? new Date());

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  return (
    <Popover
      open
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
      align="start"
      trigger={
        <button type="button" className="flex h-full w-full items-center px-2 text-left text-sm outline-none">
          {label || 'Pick date'}
        </button>
      }
    >
      <div className="w-[260px] p-1">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            className="rounded-kern-sm p-1 hover:bg-kern-surface-2"
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-kern-text">{format(cursor, 'MMMM yyyy')}</span>
          <button
            type="button"
            className="rounded-kern-sm p-1 hover:bg-kern-surface-2"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-kern-text-3">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {monthGrid.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const isSel = d ? isSameDay(day, d) : false;
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={!inMonth}
                className={cn(
                  'h-8 rounded-kern-sm text-xs',
                  !inMonth && 'pointer-events-none invisible',
                  today && 'ring-1 ring-kern-accent/40',
                  isSel && 'bg-kern-accent text-kern-on-accent',
                  !isSel && inMonth && 'text-kern-text hover:bg-kern-surface-2'
                )}
                onClick={() => onSave(format(day, 'yyyy-MM-dd'))}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}

export function DateCell({
  value,
  field,
  row: _row,
  rowId,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onEditNavigate,
}: CellComponentProps) {
  void _row;
  const isDateOnly = field.type === 'date';
  const d = parseDateValue(value);
  const label = d ? formatDateLabel(d) : '';

  if (isEditing && isDateOnly) {
    return (
      <DateOnlyPicker
        key={`${rowId}-${field.slug}-${d?.toISOString() ?? 'x'}`}
        d={d}
        label={label}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  if (isEditing && !isDateOnly) {
    const local = d ? format(d, "yyyy-MM-dd'T'HH:mm") : '';
    return (
      <input
        key={local}
        autoFocus
        type="datetime-local"
        className="h-full w-full bg-transparent px-2 text-sm outline-none"
        defaultValue={local}
        onKeyDown={(e) => {
          const parsed = new Date(e.currentTarget.value);
          const out = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
          if (e.key === 'Enter') {
            e.preventDefault();
            onSave(out);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            onSave(out);
            onEditNavigate?.(e.shiftKey ? 'prev' : 'next');
          }
        }}
        onBlur={(e) => {
          const parsed = new Date(e.currentTarget.value);
          onSave(Number.isNaN(parsed.getTime()) ? null : parsed.toISOString());
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="flex h-full w-full items-center px-2 text-left text-sm outline-none hover:bg-kern-surface-2/80"
      onClick={onStartEdit}
    >
      <span className="truncate">
        {d ? (isDateOnly ? label : `${label} ${format(d, 'h:mm a')}`) : '—'}
      </span>
    </button>
  );
}
