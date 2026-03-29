import { DebouncedStringCellEditor } from '@/components/cells/DebouncedStringCellEditor';
import type { CellComponentProps } from '@/components/cells/types';

export function PhoneCell({
  value,
  field,
  row: _row,
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
  const raw = typeof value === 'string' ? value.trim() : '';

  if (isEditing) {
    return (
      <DebouncedStringCellEditor
        key={`${rowId}-${field.slug}-${raw}`}
        display={raw}
        inputType="tel"
        className="h-full w-full bg-transparent px-2 text-sm outline-none"
        onSave={onSave}
        onCancel={onCancel}
        onEditNavigate={onEditNavigate}
        persistWhileEditing={persistWhileEditing}
        onPendingChange={onPendingChange}
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
