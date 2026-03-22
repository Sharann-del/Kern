import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { ConnectLiveSourceModal } from '@/components/collection/ConnectLiveSourceModal';
import { DeleteCollectionDialog } from '@/components/collection/DeleteCollectionDialog';
import { EditCollectionModal } from '@/components/collection/EditCollectionModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { KernCollection } from '@/types/kern';

export type CollectionActionsMenuProps = {
  collection: KernCollection;
};

export function CollectionActionsMenu({ collection }: CollectionActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const handleSync = async () => {
    const t = collection.live_source_type;
    if (!t) return;
    try {
      await supabase.functions.invoke(`sync-${t}`, { body: {} });
    } catch (e) {
      console.warn('Sync invoke failed', e);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Collection actions">
            <MoreHorizontal size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit collection</DropdownMenuItem>
          {!collection.is_live_source ? (
            <DropdownMenuItem onSelect={() => setConnectOpen(true)}>Connect live source</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => void handleSync()}>Sync now</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              console.log('Export as CSV — Task 3.4');
            }}
          >
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
            Delete collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionModal
        open={editOpen}
        onOpenChange={setEditOpen}
        collection={collection}
      />
      <ConnectLiveSourceModal open={connectOpen} onOpenChange={setConnectOpen} />
      {deleteOpen ? (
        <DeleteCollectionDialog
          key={collection.id}
          collection={collection}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}
    </>
  );
}
