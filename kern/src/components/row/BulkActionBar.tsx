import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCreateRow, useDeleteRows, useDuplicateRow } from '@/hooks/useRows';
import type { KernRow } from '@/types/kern';

export type BulkActionBarProps = {
  collectionId: string;
  selectedRowIds: Set<string>;
  rowsById: Map<string, KernRow>;
  onClearSelection: () => void;
};

export function BulkActionBar({
  collectionId,
  selectedRowIds,
  rowsById,
  onClearSelection,
}: BulkActionBarProps) {
  const n = selectedRowIds.size;
  const deleteRows = useDeleteRows();
  const duplicateRow = useDuplicateRow();
  const createRow = useCreateRow();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const selectedRows = [...selectedRowIds].map((id) => rowsById.get(id)).filter(Boolean) as KernRow[];

  const duplicateAll = async () => {
    for (const r of selectedRows) {
      await duplicateRow.mutateAsync({ row: r });
    }
    onClearSelection();
  };

  const runBulkDelete = () => {
    const snapshots = new Map(selectedRows.map((r) => [r.id, { ...r.data }]));
    const ids = [...selectedRowIds];
    deleteRows.mutate(
      { ids, collectionId },
      {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          toast.success(`${n} row${n === 1 ? '' : 's'} deleted`, {
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                for (const id of ids) {
                  const data = snapshots.get(id);
                  if (data) createRow.mutate({ collectionId, data });
                }
              },
            },
          });
          onClearSelection();
        },
      }
    );
  };

  if (n === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-4 rounded-kern-xl border border-kern-border bg-kern-bg px-4 py-2 shadow-xl">
        <span className="text-sm text-kern-text">
          {n} row{n === 1 ? '' : 's'} selected
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => void duplicateAll()}>
          Duplicate
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={deleteRows.isPending}
        >
          Delete
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${n} row${n === 1 ? '' : 's'}?`}
        description="This cannot be undone. You may be able to recreate rows from the success toast if you act quickly."
        confirmLabel={`Delete ${n} row${n === 1 ? '' : 's'}`}
        loading={deleteRows.isPending}
        onConfirm={runBulkDelete}
      />
    </>
  );
}
