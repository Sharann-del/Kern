import { useState } from 'react';

import type { CellComponentProps } from '@/components/cells/types';
import { Popover } from '@/components/ui/Popover';
import { Input } from '@/components/ui/Input';
import type { SelectFieldOptions, SelectOption } from '@/types/kern';

function selectItems(field: CellComponentProps['field']): SelectOption[] {
  if (field.type !== 'select' || !field.options || !('items' in field.options)) return [];
  return (field.options as SelectFieldOptions).items ?? [];
}

function pillStyle(color: string) {
  return {
    backgroundColor: `${color}26`,
    color,
  } as const;
}

export function SelectCell({
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
  const id = typeof value === 'string' ? value : '';
  const opt = items.find((i) => i.id === id);
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const filtered = !s ? items : items.filter((i) => i.label.toLowerCase().includes(s));

  if (isEditing) {
    return (
      <Popover
        open
        onOpenChange={(o) => {
          if (!o) onCancel();
        }}
        align="start"
        trigger={
          <button
            type="button"
            className="flex h-full w-full min-w-0 items-center px-2 text-left"
            onClick={onStartEdit}
          >
            {opt ? (
              <span
                className="max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium"
                style={pillStyle(opt.color)}
              >
                {opt.label}
              </span>
            ) : (
              <span className="text-sm text-kern-text-3">Select…</span>
            )}
          </button>
        }
      >
        <div className="w-[220px] space-y-2 p-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            autoComplete="off"
            className="text-sm"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                className="mb-1 flex w-full items-center rounded-kern-sm px-2 py-1.5 text-left hover:bg-kern-surface-2"
                onClick={() => {
                  onSave(i.id);
                }}
              >
                <span
                  className="truncate rounded-full px-2 py-0.5 text-xs font-medium"
                  style={pillStyle(i.color)}
                >
                  {i.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Popover>
    );
  }

  if (!opt) {
    return (
      <button
        type="button"
        className="flex h-full w-full items-center px-2 text-left text-sm text-kern-text-3 hover:bg-kern-surface-2/80"
        onClick={onStartEdit}
      >
        —
      </button>
    );
  }

  return (
    <button
      type="button"
      className="flex h-full w-full min-w-0 items-center px-2 text-left hover:bg-kern-surface-2/80"
      onClick={onStartEdit}
    >
      <span
        className="max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium"
        style={pillStyle(opt.color)}
      >
        {opt.label}
      </span>
    </button>
  );
}
