import { formatDistanceToNow } from 'date-fns';

import { useFields } from '@/hooks/useFields';
import { useCreateRow, useRowsDashboard } from '@/hooks/useRows';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { useAppStore } from '@/stores/appStore';
import type { KernRow } from '@/types/kern';

export type RecentRowsWidgetProps = {
  config: { collection_id: string; limit: number; show_fields: string[] };
};

function formatFieldSnippet(row: KernRow, slug: string | undefined): string {
  if (!slug) return '';
  const v = row.data[slug];
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.join(', ');
  return '';
}

export function RecentRowsWidget({ config }: RecentRowsWidgetProps) {
  const openRow = useAppStore((s) => s.openRow);
  const createRow = useCreateRow();
  const { data: rows = [], isLoading } = useRowsDashboard(config.collection_id);
  const { data: fields = [] } = useFields(config.collection_id);

  const limit =
    typeof config.limit === 'number' && Number.isFinite(config.limit) ? config.limit : 10;
  const slice = rows.slice(0, limit);
  const showFields = Array.isArray(config.show_fields) ? config.show_fields : [];
  const secondarySlug = showFields[0];

  const handleAddRow = () => {
    createRow.mutate(
      { collectionId: config.collection_id },
      {
        onSuccess: (created) => {
          openRow(created.id, config.collection_id);
        },
      }
    );
  };

  if (isLoading) {
    return <p className="text-xs text-kern-text-3">Loading…</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
        {slice.map((row) => {
          const primary = rowPrimaryLabel(row, fields);
          const extra = formatFieldSnippet(row, secondarySlug);
          const ago = formatDistanceToNow(new Date(row.created_at), { addSuffix: true });
          return (
            <li key={row.id}>
              <button
                type="button"
                className="w-full rounded-kern-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-kern-surface-2"
                onClick={() => openRow(row.id, config.collection_id)}
              >
                <span className="font-medium text-kern-text">{primary}</span>
                {extra ? (
                  <span className="ml-2 text-kern-text-2">· {extra}</span>
                ) : null}
                <span className="mt-0.5 block text-xs text-kern-text-3">{ago}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {slice.length === 0 ? (
        <p className="text-xs text-kern-text-3">No rows yet.</p>
      ) : null}
      <button
        type="button"
        className="text-left text-xs font-medium text-kern-accent hover:underline"
        onClick={handleAddRow}
        disabled={createRow.isPending}
      >
        + Add row
      </button>
    </div>
  );
}
