import type { CellComponentProps } from '@/components/cells/types';
import type { NumberFieldOptions } from '@/types/kern';
import { cn } from '@/lib/utils';

function numOpts(field: CellComponentProps['field']): NumberFieldOptions {
  if (field.type === 'number' && field.options && typeof field.options === 'object') {
    return field.options as NumberFieldOptions;
  }
  return {};
}

export function NumberCell({
  value,
  field,
  row: _row,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onEditNavigate,
}: CellComponentProps) {
  void _row;
  const opts = numOpts(field);
  const n = typeof value === 'number' ? value : value === '' || value == null ? NaN : Number(value);
  const hasNum = Number.isFinite(n);
  const display = hasNum ? String(n) : '';
  const unit = opts.unit ?? '';
  const max = opts.max ?? 100;
  const showProgress = Boolean(opts.show_as_progress && hasNum && max > 0);
  const pct = showProgress ? Math.min(100, Math.max(0, (n / max) * 100)) : 0;

  if (isEditing) {
    return (
      <input
        key={display}
        autoFocus
        type="number"
        className="h-full w-full bg-transparent text-right text-sm outline-none"
        defaultValue={display}
        onKeyDown={(e) => {
          const parsed = parseFloat(e.currentTarget.value);
          const out = Number.isFinite(parsed) ? parsed : null;
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
          const parsed = parseFloat(e.currentTarget.value);
          onSave(Number.isFinite(parsed) ? parsed : null);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'flex h-full w-full min-w-0 flex-col justify-center gap-1 px-2 text-right outline-none',
        'rounded-kern-sm hover:bg-kern-surface-2/80 focus-visible:ring-2 focus-visible:ring-kern-accent/30'
      )}
      onClick={onStartEdit}
    >
      {showProgress ? (
        <div className="h-1.5 w-full rounded-full bg-kern-surface-2">
          <div className="h-full rounded-full bg-kern-accent" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <span className="truncate text-sm tabular-nums">
        {hasNum ? `${display}${unit ? ` ${unit}` : ''}` : '—'}
      </span>
    </button>
  );
}
