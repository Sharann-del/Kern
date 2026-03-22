import type { CellComponentProps } from '@/components/cells/types';

export function PhoneCell({
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

  if (isEditing) {
    return (
      <input
        key={raw}
        autoFocus
        type="tel"
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

  const tel = raw.replace(/[^\d+]/g, '');
  return (
    <a
      href={`tel:${tel}`}
      className="flex h-full w-full items-center px-2 text-sm hover:bg-kern-surface-2/80"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {raw}
    </a>
  );
}
