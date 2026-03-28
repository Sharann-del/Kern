import * as ContextMenu from '@radix-ui/react-context-menu';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { useRadixDataStateOpen } from '@/hooks/useRadixDataStateOpen';
import { useCreateRow, useDeleteRow, useDuplicateRow } from '@/hooks/useRows';
import { VARIANTS } from '@/lib/animations';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import type { KernRow } from '@/types/kern';

export type RowContextMenuProps = {
  children: React.ReactNode;
  row: KernRow;
  collectionId: string;
};

export function RowContextMenu({ children, row, collectionId }: RowContextMenuProps) {
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const menuOpen = useRadixDataStateOpen(contentNode);
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
        <ContextMenu.Content forceMount asChild onClick={(e) => e.stopPropagation()}>
          <motion.div
            ref={setContentNode}
            className={cn(
              'z-[220] min-w-[160px] origin-[var(--radix-context-menu-content-transform-origin)] rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg',
              !menuOpen && 'pointer-events-none'
            )}
            style={{ transformOrigin: 'var(--radix-context-menu-content-transform-origin)' }}
            variants={VARIANTS.scaleIn}
            initial="hidden"
            animate={menuOpen ? 'visible' : 'hidden'}
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
          </motion.div>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
