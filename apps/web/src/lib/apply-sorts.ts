import type { KernField, KernRow, SelectFieldOptions, SortRule } from '@/types/kern';

function compareValues(aVal: unknown, bVal: unknown, field: KernField | undefined): number {
  if (field?.type === 'number') {
    return Number(aVal) - Number(bVal);
  }
  if (field?.type === 'date' || field?.type === 'datetime') {
    return new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime();
  }
  if (field?.type === 'boolean') {
    return (aVal ? 1 : 0) - (bVal ? 1 : 0);
  }
  if (field?.type === 'select') {
    const options = (field.options as SelectFieldOptions | null)?.items ?? [];
    const aLabel = options.find((o) => o.id === aVal)?.label ?? String(aVal);
    const bLabel = options.find((o) => o.id === bVal)?.label ?? String(bVal);
    return aLabel.localeCompare(bLabel);
  }
  if (field?.type === 'multi_select') {
    const options = (field.options as SelectFieldOptions | null)?.items ?? [];
    const aIds = Array.isArray(aVal) ? aVal.map(String) : [];
    const bIds = Array.isArray(bVal) ? bVal.map(String) : [];
    const aLabel = aIds
      .map((id) => options.find((o) => o.id === id)?.label ?? id)
      .sort()
      .join(', ');
    const bLabel = bIds
      .map((id) => options.find((o) => o.id === id)?.label ?? id)
      .sort()
      .join(', ');
    return aLabel.localeCompare(bLabel);
  }
  return String(aVal).localeCompare(String(bVal));
}

export function applySorts(rows: KernRow[], sorts: SortRule[], fields: KernField[]): KernRow[] {
  if (!sorts.length) return rows;
  const next = [...rows];
  next.sort((a, b) => {
    for (const sort of sorts) {
      const field = fields.find((f) => f.slug === sort.field_slug);
      const aVal = a.data[sort.field_slug];
      const bVal = b.data[sort.field_slug];

      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = compareValues(aVal, bVal, field);
      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
  return next;
}
