import { MoreHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import type { KernCollection } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

export type CollectionActionsMenuProps = {
  collection: KernCollection;
  /** Opens the same modal as the header “Connect live source” button. */
  onOpenConnectLiveSource?: () => void;
};

export function CollectionActionsMenu({ collection, onOpenConnectLiveSource }: CollectionActionsMenuProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSync = async () => {
    const t = collection.live_source_type;
    if (!t?.startsWith('github_')) return;
    try {
      const { error, response } = await invokeAuthedEdgeFunction<unknown>('sync-github', {
        body: { collection_id: collection.id },
      });
      if (error) {
        toast.error(await describeFunctionsInvokeError(error, response));
        return;
      }
      if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      void queryClient.invalidateQueries({ queryKey: ['rows', collection.id] });
      void queryClient.invalidateQueries({ queryKey: ['collection', collection.slug, userId] });
      void queryClient.invalidateQueries({ queryKey: ['collectionById', collection.id, userId] });
      toast.success('Synced');
    } catch (e) {
      toast.error(await describeFunctionsInvokeError(e));
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
            <DropdownMenuItem
              onSelect={() => {
                onOpenConnectLiveSource?.();
              }}
            >
              Connect live source
            </DropdownMenuItem>
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
