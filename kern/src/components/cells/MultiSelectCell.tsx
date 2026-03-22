import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { useState } from 'react';

import type { CellComponentProps } from '@/components/cells/types';
import { Popover } from '@/components/ui/Popover';
import { Input } from '@/components/ui/Input';
import type { SelectFieldOptions, SelectOption } from '@/types/kern';
import { cn } from '@/lib/utils';

function selectItems(field: CellComponentProps['field']): SelectOption[] {
  if (field.type !== 'multi_select' || !field.options || !('items' in field.options)) return [];
  return (field.options as SelectFieldOptions).items ?? [];
}

function pillStyle(color: string) {
  return {
    backgroundColor: `${color}26`,
    color,
  } as const;
}

function asIdArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  return [];
}

export function MultiSelectCell({
  value,
  field,
  row: _row,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: CellComponentProps) {
  void _row;
  const items = selectItems(field);
  const ids = asIdArray(value);
  const selected = items.filter((i) => ids.includes(i.id));
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const filtered = !s ? items : items.filter((i) => i.label.toLowerCase().includes(s));

  const visible = selected.slice(0, 2);
  const more = selected.length - visible.length;

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(ids);
    if (checked) next.add(id);
    else next.delete(id);
    onSave([...next]);
  };

  if (isEditing) {
    return (
      <Popover
        open
        onOpenChange={(o) => {
          if (!o) onCancel();
        }}
        align="start"
        trigger={
          <button type="button" className="flex h-full w-full min-w-0 flex-wrap items-center gap-1 px-2 py-0.5">
            {selected.length === 0 ? (
              <span className="text-sm text-kern-text-3">Add…</span>
            ) : (
              <>
                {visible.map((i) => (
                  <span
                    key={i.id}
                    className="max-w-[100px] truncate rounded-full px-2 py-0.5 text-xs font-medium"
                    style={pillStyle(i.color)}
                  >
                    {i.label}
                  </span>
                ))}
                {more > 0 ? (
                  <span className="text-xs text-kern-text-3">+{more} more</span>
                ) : null}
              </>
            )}
          </button>
        }
      >
        <div className="w-[240px] space-y-2 p-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" autoComplete="off" />
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {filtered.map((i) => {
              const on = ids.includes(i.id);
              return (
                <label
                  key={i.id}
                  className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 hover:bg-kern-surface-2"
                >
                  <Checkbox.Root
                    checked={on}
                    onCheckedChange={(c) => toggle(i.id, c === true)}
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                      'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
                    )}
                  >
                    <Checkbox.Indicator className="text-kern-on-accent">
                      <Check size={12} strokeWidth={3} />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <span
                    className="min-w-0 truncate rounded-full px-2 py-0.5 text-xs font-medium"
                    style={pillStyle(i.color)}
                  >
                    {i.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </Popover>
    );
  }

  if (selected.length === 0) {
    return (
      <button
        type="button"
        className="flex h-full w-full items-center px-2 text-sm text-kern-text-3 hover:bg-kern-surface-2/80"
        onClick={onStartEdit}
      >
        —
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex h-full w-full min-w-0 flex-wrap items-center gap-1 px-2 py-0.5 text-left hover:bg-kern-surface-2/80"
      onClick={onStartEdit}
    >
      {visible.map((i) => (
        <span
          key={i.id}
          className="max-w-[100px] truncate rounded-full px-2 py-0.5 text-xs font-medium"
          style={pillStyle(i.color)}
        >
          {i.label}
        </span>
      ))}
      {more > 0 ? <span className="text-xs text-kern-text-3">+{more} more</span> : null}
    </button>
  );
}
