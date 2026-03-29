import { useRef, useState } from 'react';

import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAssignCustomView, type CustomViewAssignmentRow } from '@/hooks/useCustomViews';
import { useCollections } from '@/hooks/useCollections';
import { useDeleteView } from '@/hooks/useViews';
import { cn } from '@/lib/utils';

export type AssignCustomViewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customViewId: string | null;
  /** Assignments for this custom view when the modal opened (parent passes; modal key remounts on change). */
  assignmentRows: CustomViewAssignmentRow[];
  title?: string;
};

export function AssignCustomViewModal({
  open,
  onOpenChange,
  customViewId,
  assignmentRows,
  title = 'Assign to collections',
}: AssignCustomViewModalProps) {
  const { data: collections = [], isLoading: collectionsLoading } = useCollections();
  const assign = useAssignCustomView();
  const deleteView = useDeleteView();

  const snapshotRowsRef = useRef<CustomViewAssignmentRow[]>([...assignmentRows]);
  const snapshotRef = useRef(new Set(assignmentRows.map((r) => r.collectionId)));
  const [checkedIds, setCheckedIds] = useState(
    () => new Set(assignmentRows.map((r) => r.collectionId))
  );

  const toggle = (collectionId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!customViewId) return;
    const prev = snapshotRef.current;
    const next = checkedIds;
    const toAdd = [...next].filter((id) => !prev.has(id));
    const toRemove = [...prev].filter((id) => !next.has(id));

    try {
      for (const collectionId of toAdd) {
        await assign.mutateAsync({ customViewId, collectionId });
      }
      for (const collectionId of toRemove) {
        const row = snapshotRowsRef.current.find(
          (r) => r.collectionId === collectionId && r.customViewId === customViewId
        );
        if (row) {
          await deleteView.mutateAsync({ id: row.viewRowId, collectionId });
        }
      }
      onOpenChange(false);
    } catch {
      /* toasts from mutations */
    }
  };

  const busy = assign.isPending || deleteView.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Choose which collections show this custom view as a tab."
      maxWidth={480}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={busy}
            disabled={!customViewId}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
        </div>
      }
    >
      {collectionsLoading ? (
        <p className="text-sm text-kern-text-2">Loading collections…</p>
      ) : collections.length === 0 ? (
        <p className="text-sm text-kern-text-2">No collections yet.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {collections.map((c) => {
            const isChecked = checkedIds.has(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-kern-sm px-2 py-2 hover:bg-kern-surface-2"
              >
                <Checkbox.Root
                  checked={isChecked}
                  onCheckedChange={() => toggle(c.id)}
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                    'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
                  )}
                >
                  <Checkbox.Indicator className="text-white">
                    <Check size={12} strokeWidth={3} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span className="min-w-0 flex-1 truncate text-sm text-kern-text">{c.name}</span>
              </label>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
