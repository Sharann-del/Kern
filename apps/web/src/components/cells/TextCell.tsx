import type { CellComponentProps } from '@/components/cells/types';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

type TextCellEditorProps = Pick<
  CellComponentProps,
  'onSave' | 'onCancel' | 'onEditNavigate' | 'persistWhileEditing' | 'onPendingChange'
> & {
  display: string;
};

function TextCellEditor({
  display,
  onSave,
  onCancel,
  onEditNavigate,
  persistWhileEditing,
  onPendingChange,
}: TextCellEditorProps) {
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
    (v: string) => {
      if (!persistWhileEditing) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onPendingChange?.(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistWhileEditing(v);
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
      className="h-full w-full bg-transparent text-sm outline-none"
      value={editValue}
      onChange={(e) => {
        const v = e.target.value;
        setEditValue(v);
        schedulePersist(v);
      }}
      onKeyDown={(e) => {
        const v = e.currentTarget.value;
        if (e.key === 'Enter') {
          e.preventDefault();
          clearDebounce();
          onSave(v, { row: e.shiftKey ? 'up' : 'down' });
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
          onSave(v);
          onEditNavigate?.(e.shiftKey ? 'prev' : 'next');
        }
      }}
      onBlur={() => {
        clearDebounce();
        onSave(editValue);
      }}
    />
  );
}

export function TextCell({
  value,
  row: _row,
  field,
  rowId,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onEditNavigate,
  persistWhileEditing,
  onPendingChange,
}: CellComponentProps) {
  void _row;
  const display = String(value ?? '');

  if (isEditing) {
    return (
      <TextCellEditor
        key={`${rowId}-${field.slug}-${display}`}
        display={display}
        onSave={onSave}
        onCancel={onCancel}
        onEditNavigate={onEditNavigate}
        persistWhileEditing={persistWhileEditing}
        onPendingChange={onPendingChange}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'flex h-full w-full min-w-0 items-center px-2 text-left',
        'rounded-kern-sm outline-none hover:bg-kern-surface-2/80 focus-visible:ring-0'
      )}
      onClick={onStartEdit}
    >
      <span className="truncate text-sm">{display}</span>
    </button>
  );
}
