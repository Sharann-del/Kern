import type { KernField, KernRow } from '@/types/kern';

export function rowPrimaryLabel(row: KernRow, fields: KernField[]): string {
  const primary = fields.find((f) => f.is_primary);
  if (primary) {
    const v = row.data[primary.slug];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  for (const v of Object.values(row.data)) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return `Row ${row.id.slice(0, 8)}…`;
}
