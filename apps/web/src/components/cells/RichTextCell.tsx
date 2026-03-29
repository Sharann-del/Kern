import type { CellComponentProps } from '@/components/cells/types';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ');
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
}

type RichTextCellEditorProps = Pick<
  CellComponentProps,
  'onSave' | 'onCancel' | 'onEditNavigate' | 'persistWhileEditing' | 'onPendingChange'
> & {
  raw: string;
};

function RichTextCellEditor({
  raw,
  onSave,
  onCancel,
  onEditNavigate,
  persistWhileEditing,
  onPendingChange,
}: RichTextCellEditorProps) {
  const [editValue, setEditValue] = useState(raw);
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
    <textarea
      autoFocus
      className="h-full min-h-[32px] w-full resize-none bg-transparent px-2 py-1 text-sm outline-none"
      value={editValue}
      onChange={(e) => {
        const v = e.target.value;
        setEditValue(v);
        schedulePersist(v);
      }}
      onKeyDown={(e) => {
        const v = e.currentTarget.value;
        if (e.key === 'Escape') {
          e.preventDefault();
          clearDebounce();
          onCancel();
          return;
        }
        if (e.key === 'Enter' && e.shiftKey) {
          return;
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          clearDebounce();
          onSave(v);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          clearDebounce();
          onSave(v, { row: 'down' });
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

export function RichTextCell({
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
  const raw = typeof value === 'string' ? value : '';
  const display = stripHtml(raw) || '';

  if (isEditing) {
    return (
      <RichTextCellEditor
        key={`${rowId}-${field.slug}-${raw.slice(0, 64)}`}
        raw={raw}
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
      <span className="line-clamp-2 text-sm">{display || '—'}</span>
    </button>
  );
}
