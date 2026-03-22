import type { FilterRule, KernField, KernRow, SelectFieldOptions } from '@/types/kern';

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function toDateMs(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime();
  return Number.isNaN(t) ? NaN : t;
}

function toYmd(v: unknown): string {
  const t = new Date(String(v ?? ''));
  if (Number.isNaN(t.getTime())) return '';
  return t.toISOString().slice(0, 10);
}

function resolveSelectOptionId(field: KernField | undefined, filterValue: unknown): string {
  const raw = String(filterValue ?? '');
  if (!field || field.type !== 'select') return raw;
  const items = (field.options as SelectFieldOptions | null)?.items ?? [];
  if (items.some((o) => o.id === raw)) return raw;
  const byLabel = items.find((o) => o.label.toLowerCase() === raw.toLowerCase());
  return byLabel?.id ?? raw;
}

function textEq(a: unknown, b: unknown): boolean {
  return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
}

function multiIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x));
}

export function applyFilters(rows: KernRow[], filters: FilterRule[], fields: KernField[]): KernRow[] {
  if (!filters.length) return rows;
  return rows.filter((row) => filters.every((filter) => evaluateFilter(row, filter, fields)));
}

function evaluateFilter(row: KernRow, filter: FilterRule, fields: KernField[]): boolean {
  const field = fields.find((f) => f.slug === filter.field_slug);
  const value = row.data[filter.field_slug];
  const op = filter.operator;
  const fv = filter.value;
  const ftype = field?.type;

  switch (op) {
    case 'is_empty':
      return isEmptyValue(value);
    case 'is_not_empty':
      return !isEmptyValue(value);
    case 'is_true':
      return value === true;
    case 'is_false':
      return value === false || !value;
    default:
      break;
  }

  switch (op) {
    case 'contains': {
      if (ftype === 'multi_select') {
        return multiIds(value).includes(String(fv ?? ''));
      }
      return String(value ?? '').toLowerCase().includes(String(fv ?? '').toLowerCase());
    }
    case 'not_contains': {
      if (ftype === 'multi_select') {
        return !multiIds(value).includes(String(fv ?? ''));
      }
      return !String(value ?? '').toLowerCase().includes(String(fv ?? '').toLowerCase());
    }
    case 'starts_with':
      return String(value ?? '').toLowerCase().startsWith(String(fv ?? '').toLowerCase());
    case 'ends_with':
      return String(value ?? '').toLowerCase().endsWith(String(fv ?? '').toLowerCase());
    case 'eq': {
      if (ftype === 'number') {
        return Number(value) === Number(fv);
      }
      if (ftype === 'boolean') {
        if (typeof fv === 'boolean') return value === fv;
        if (fv === 'true' || fv === 1) return value === true;
        if (fv === 'false' || fv === 0) return value === false;
        return value === fv;
      }
      if (ftype === 'select') {
        const id = resolveSelectOptionId(field, fv);
        return String(value ?? '') === id;
      }
      if (ftype === 'date' || ftype === 'datetime') {
        return toYmd(value) === toYmd(fv);
      }
      return textEq(value, fv);
    }
    case 'neq': {
      if (ftype === 'number') {
        return Number(value) !== Number(fv);
      }
      if (ftype === 'select') {
        const id = resolveSelectOptionId(field, fv);
        return String(value ?? '') !== id;
      }
      if (ftype === 'date' || ftype === 'datetime') {
        return toYmd(value) !== toYmd(fv);
      }
      return !textEq(value, fv);
    }
    case 'gt': {
      const a = Number(value);
      const b = Number(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    case 'lt': {
      const a = Number(value);
      const b = Number(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
    }
    case 'gte': {
      if (ftype === 'date' || ftype === 'datetime') {
        const a = toDateMs(value);
        const b = toDateMs(fv);
        return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
      }
      const a = Number(value);
      const b = Number(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
    }
    case 'lte': {
      if (ftype === 'date' || ftype === 'datetime') {
        const a = toDateMs(value);
        const b = toDateMs(fv);
        return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
      }
      const a = Number(value);
      const b = Number(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
    }
    case 'before': {
      const a = toDateMs(value);
      const b = toDateMs(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
    }
    case 'after': {
      const a = toDateMs(value);
      const b = toDateMs(fv);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    case 'on': {
      return toYmd(value) === toYmd(fv);
    }
    default:
      return true;
  }
}
