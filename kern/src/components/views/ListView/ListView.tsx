import { List, Plus } from 'lucide-react';
import { useMemo } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { formatCellValueForCard } from '@/lib/formatCellDisplay';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { formatRelativeTime } from '@/lib/utils';
import { useCreateRow } from '@/hooks/useRows';
import { useAppStore } from '@/stores/appStore';
import type { KernField, KernRow, ViewConfig } from '@/types/kern';

export type ListViewProps = {
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  collectionId: string;
};

export function ListView({ rows, fields, viewConfig: _viewConfig, collectionId }: ListViewProps) {
  void _viewConfig;
  const createRow = useCreateRow();
  const openRow = useAppStore((s) => s.openRow);

  const secondaryField = useMemo(
    () =>
      [...fields]
        .sort((a, b) => a.sort_order - b.sort_order)
        .find((f) => !f.is_primary && !f.is_hidden_by_default),
    [fields]
  );

  const addRow = () => {
    createRow.mutate(
      { collectionId, data: {} },
      {
        onSuccess: (r) => openRow(r.id, collectionId),
      }
    );
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={List}
        title="No rows yet"
        subtitle="Create a row to get started."
        actionLabel="Add item"
        onAction={addRow}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-kern-lg border border-kern-border bg-kern-bg">
      {rows.map((row) => {
        const primary = rowPrimaryLabel(row, fields);
        const secVal =
          secondaryField != null ? row.data[secondaryField.slug] : undefined;
        const secondaryText =
          secondaryField != null && secVal !== null && secVal !== undefined && secVal !== ''
            ? formatCellValueForCard(secondaryField, secVal)
            : '';
        return (
          <button
            key={row.id}
            type="button"
            className="flex h-10 w-full items-center gap-3 border-b border-kern-surface-2 px-4 text-left last:border-b-0 hover:cursor-pointer hover:bg-kern-surface"
            onClick={() => openRow(row.id, collectionId)}
          >
            <span className="min-w-0 flex-1 truncate text-sm text-kern-text">{primary}</span>
            {secondaryField && secondaryText ? (
              <span className="max-w-[200px] shrink-0 truncate text-sm text-kern-text-2">{secondaryText}</span>
            ) : null}
            <span className="shrink-0 text-xs text-kern-text-3">{formatRelativeTime(row.created_at)}</span>
          </button>
        );
      })}
      <button
        type="button"
        disabled={createRow.isPending}
        className="flex h-10 w-full items-center gap-2 px-4 text-sm text-kern-text-2 hover:bg-kern-surface"
        onClick={addRow}
      >
        <Plus className="h-4 w-4 shrink-0" aria-hidden />
        Add item
      </button>
    </div>
  );
}
