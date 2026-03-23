import { useCallback, useEffect, useRef, useState } from 'react';

import type { CellComponentProps } from '@/components/cells/types';

type Props = Pick<
  CellComponentProps,
  'onSave' | 'onCancel' | 'onEditNavigate' | 'persistWhileEditing' | 'onPendingChange'
> & {
  display: string;
};

function parseNumber(raw: string): number | null {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function DebouncedNumberCellEditor({
  display,
  onSave,
  onCancel,
  onEditNavigate,
  persistWhileEditing,
  onPendingChange,
}: Props) {
  const [editValue, setEditValue] = useState(display);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onPendingChange?.(false);
  }, [onPendingChange]);

  const schedulePersist = useCallback(
    (raw: string) => {
      if (!persistWhileEditing) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onPendingChange?.(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistWhileEditing(parseNumber(raw));
        onPendingChange?.(false);
      }, 500);
    },
    [persistWhileEditing, onPendingChange]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onPendingChange?.(false);
    },
    [onPendingChange]
  );

  return (
    <input
      autoFocus
      type="number"
      className="h-full w-full bg-transparent text-right text-sm outline-none"
      value={editValue}
      onChange={(e) => {
        const v = e.target.value;
        setEditValue(v);
        schedulePersist(v);
      }}
      onKeyDown={(e) => {
        const out = parseNumber(e.currentTarget.value);
        if (e.key === 'Enter') {
          e.preventDefault();
          clearDebounce();
          onSave(out, { row: e.shiftKey ? 'up' : 'down' });
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          clearDebounce();
          onCancel();
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          clearDebounce();
          onSave(out);
          onEditNavigate?.(e.shiftKey ? 'prev' : 'next');
        }
      }}
      onBlur={() => {
        clearDebounce();
        onSave(parseNumber(editValue));
      }}
    />
  );
}
