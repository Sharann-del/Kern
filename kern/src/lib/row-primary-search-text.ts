import type { KernField, KernRow, SelectFieldOptions } from '@/types/kern';
import { getPrimaryField } from '@/lib/utils';

function valueAsSearchText(field: KernField, raw: unknown): string {
  if (raw === null || raw === undefined) return '';

  switch (field.type) {
    case 'select': {
      const options = (field.options as SelectFieldOptions | null)?.items ?? [];
      const id = String(raw);
      return options.find((o) => o.id === id)?.label ?? id;
    }
    case 'multi_select': {
      const options = (field.options as SelectFieldOptions | null)?.items ?? [];
      const ids = Array.isArray(raw) ? (raw as string[]).map(String) : [];
      return ids.map((x) => options.find((o) => o.id === x)?.label ?? x).join(' ');
    }
    case 'boolean':
      return raw ? 'Yes' : 'No';
    case 'file': {
      const files = Array.isArray(raw) ? (raw as Array<{ name?: string }>) : [];
      return files.map((f) => (typeof f?.name === 'string' ? f.name : '')).filter(Boolean).join(' ');
    }
    default:
      return String(raw);
  }
}

/** Plain-text representation of the primary field for quick search (subset of CSV/display logic). */
export function primaryFieldSearchText(row: KernRow, fields: KernField[]): string {
  const primary = getPrimaryField(fields);
  if (!primary) return '';
  return valueAsSearchText(primary, row.data[primary.slug]);
}
