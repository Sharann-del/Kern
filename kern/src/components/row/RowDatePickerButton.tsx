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

import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
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

export type RowDatePickerButtonProps = {
  value: unknown;
  onChange: (isoDate: string) => void;
};

export function RowDatePickerButton({ value, onChange }: RowDatePickerButtonProps) {
  const d = parseDateValue(value);
  const label = d ? formatDateLabel(d) : 'Pick date';
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => d ?? new Date());

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setCursor(d ?? new Date());
      }}
      align="start"
      trigger={
        <Button type="button" variant="secondary" size="sm" className="h-9 w-full justify-start font-normal">
          {label}
        </Button>
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
                onClick={() => {
                  onChange(format(day, 'yyyy-MM-dd'));
                  setOpen(false);
                }}
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
