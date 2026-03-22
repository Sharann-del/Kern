import { useAppStore } from '@/stores/appStore';
import type { KernRow, RelationFieldOptions } from '@/types/kern';

import type { CellComponentProps } from '@/components/cells/types';

function relationOpts(field: CellComponentProps['field']): RelationFieldOptions | null {
  if (field.type !== 'relation' || !field.options || typeof field.options !== 'object') return null;
  const o = field.options as RelationFieldOptions;
  return o.target_collection_id ? o : null;
}

function rowLabel(r: KernRow): string {
  const vals = Object.values(r.data);
  const s = vals.find((v) => typeof v === 'string' && v.trim()) as string | undefined;
  return s?.trim() || `Row ${r.id.slice(0, 8)}…`;
}

function idsFromValue(value: unknown): string[] {
  if (typeof value === 'string' && value) return [value];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  return [];
}

export function RelationCell({ value, field, row, rowId: _rowId }: CellComponentProps) {
  void _rowId;
  const openRow = useAppStore((s) => s.openRow);
  const opts = relationOpts(field);
  const targetCollectionId = opts?.target_collection_id ?? '';
  const ids = idsFromValue(value);
  const resolved = row.relations?.[field.slug];

  const pills: { id: string; label: string }[] = [];
  if (resolved?.length) {
    for (const r of resolved) {
      pills.push({ id: r.id, label: rowLabel(r) });
    }
  } else {
    for (const id of ids) {
      pills.push({ id, label: id.slice(0, 8) + '…' });
    }
  }

  if (pills.length === 0) {
    return (
      <div className="flex h-full w-full items-center px-2 text-sm text-kern-text-3" title="Relation (picker in Task 1.10)">
        —
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-wrap items-center gap-1 px-2 py-0.5">
      {pills.map((p) => (
        <button
          key={p.id}
          type="button"
          className="max-w-[120px] truncate rounded border border-kern-border px-2 py-0.5 text-xs hover:bg-kern-surface-2"
          onClick={(e) => {
            e.stopPropagation();
            if (targetCollectionId) openRow(p.id, targetCollectionId);
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
