import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { KernCollection, KernField, SelectFieldOptions } from '@/types/kern';

type RowDb = {
  id: string;
  data: Json;
  sort_order: number;
};

function escapeCSV(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

function cellForField(field: KernField, raw: unknown): string {
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
      return ids.map((x) => options.find((o) => o.id === x)?.label ?? x).join(', ');
    }
    case 'boolean':
      return raw ? 'Yes' : 'No';
    case 'file': {
      const files = Array.isArray(raw) ? (raw as Array<{ name?: string }>) : [];
      return files.map((f) => (typeof f?.name === 'string' ? f.name : '')).filter(Boolean).join(', ');
    }
    default:
      return String(raw);
  }
}

/**
 * Fetches all rows for the collection and downloads a CSV with columns matching `fields` order.
 */
export async function exportCollectionAsCSV(collection: KernCollection, fields: KernField[]): Promise<void> {
  const { data: rows, error } = await supabase
    .from('rows')
    .select('id, data, sort_order')
    .eq('collection_id', collection.id)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const rowDbs = (rows ?? []) as RowDb[];
  const headers = fields.map((f) => f.name);
  const csvRows = rowDbs.map((row) => {
    const data =
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {};
    return fields.map((field) => {
      const value = data[field.slug];
      return cellForField(field, value);
    });
  });

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...csvRows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${collection.slug}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
