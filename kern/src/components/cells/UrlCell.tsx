import { ExternalLink } from 'lucide-react';

import type { CellComponentProps } from '@/components/cells/types';
import { cn } from '@/lib/utils';

export function UrlCell({
  value,
  row: _row,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onEditNavigate,
}: CellComponentProps) {
  void _row;
  const raw = typeof value === 'string' ? value.trim() : '';
  const href = raw && /^https?:\/\//i.test(raw) ? raw : raw ? `https://${raw}` : '';

  if (isEditing) {
    return (
      <input
        key={raw}
        autoFocus
        type="url"
        className="h-full w-full bg-transparent px-2 text-sm outline-none"
        defaultValue={raw}
        onKeyDown={(e) => {
          const v = e.currentTarget.value.trim();
          if (e.key === 'Enter') {
            e.preventDefault();
            onSave(v);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            onSave(v);
            onEditNavigate?.(e.shiftKey ? 'prev' : 'next');
          }
        }}
        onBlur={(e) => onSave(e.currentTarget.value.trim())}
      />
    );
  }

  if (!raw) {
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
      className={cn(
        'flex h-full min-w-0 items-center gap-1 px-2 text-left text-sm text-kern-accent underline',
        'hover:bg-kern-surface-2/80'
      )}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.stopPropagation();
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }
        onStartEdit();
      }}
    >
      <ExternalLink size={12} className="shrink-0 opacity-80" />
      <span className="truncate">{raw}</span>
    </button>
  );
}
