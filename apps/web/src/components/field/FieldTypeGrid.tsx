import { FIELD_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/kern';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';

export type FieldTypeGridProps = {
  value: FieldType;
  onChange: (type: FieldType) => void;
  disabled?: boolean;
};

export function FieldTypeGrid({ value, onChange, disabled }: FieldTypeGridProps) {
  return (
    <div
      className={cn('grid grid-cols-3 gap-2', disabled && 'pointer-events-none opacity-50')}
      role="listbox"
      aria-disabled={disabled}
    >
      {FIELD_TYPES.map((ft) => {
        const selected = value === ft.type;
        return (
          <button
            key={ft.type}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(ft.type)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-kern-md border border-kern-border p-2.5 text-left transition-colors duration-ds-fast',
              selected
                ? 'border-kern-accent bg-kern-accent/5 text-kern-accent'
                : 'text-kern-text hover:bg-kern-surface-2'
            )}
          >
            <FieldTypeIcon type={ft.type} size={16} className={selected ? 'text-kern-accent' : 'text-kern-text-2'} />
            <span className="text-xs font-medium">{ft.label}</span>
            <span
              className={cn(
                'line-clamp-2 text-[11px] leading-snug',
                selected ? 'text-kern-accent/90' : 'text-kern-text-3'
              )}
            >
              {ft.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
