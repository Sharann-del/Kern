import * as ContextMenu from '@radix-ui/react-context-menu';
import { toast } from 'sonner';

import { useCreateRow, useDeleteRow, useDuplicateRow } from '@/hooks/useRows';
import { useAppStore } from '@/stores/appStore';
import type { KernRow } from '@/types/kern';

export type RowContextMenuProps = {
  children: React.ReactNode;
  row: KernRow;
  collectionId: string;
};

export function RowContextMenu({ children, row, collectionId }: RowContextMenuProps) {
  const openRow = useAppStore((s) => s.openRow);
  const deleteRow = useDeleteRow();
  const duplicateRow = useDuplicateRow();
  const createRow = useCreateRow();

  const handleDelete = () => {
    const snapshot = { ...row.data };
    deleteRow.mutate(
      { id: row.id, collectionId },
      {
        onSuccess: () => {
          toast.success('Row deleted', {
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                createRow.mutate({ collectionId, data: snapshot });
              },
            },
          });
        },
      }
    );
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-50 min-w-[160px] rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg animate-kern-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-text outline-none data-[highlighted]:bg-kern-surface-2"
            onSelect={() => openRow(row.id, collectionId)}
          >
            Open
          </ContextMenu.Item>
          <ContextMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-text outline-none data-[highlighted]:bg-kern-surface-2"
            onSelect={() => duplicateRow.mutate({ row })}
          >
            Duplicate
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 border-t border-kern-border" />
          <ContextMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-danger outline-none data-[highlighted]:bg-red-50"
            onSelect={handleDelete}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
