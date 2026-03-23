import { formatRelativeTime } from '@/lib/utils';
import type { KernField, SelectFieldOptions } from '@/types/kern';

export function formatCellValueForCard(field: KernField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  switch (field.type) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'select': {
      const items = (field.options as SelectFieldOptions | null)?.items ?? [];
      const opt = items.find((i) => i.id === value);
      return opt?.label ?? String(value);
    }
    case 'multi_select': {
      const items = (field.options as SelectFieldOptions | null)?.items ?? [];
      const ids = Array.isArray(value) ? (value as unknown[]) : [];
      return ids
        .map((id) => items.find((i) => i.id === id)?.label ?? String(id))
        .join(', ');
    }
    case 'date':
    case 'datetime':
      return formatRelativeTime(String(value));
    default:
      if (Array.isArray(value)) return value.map(String).join(', ');
      return String(value);
  }
}
