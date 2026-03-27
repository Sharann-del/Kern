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
import { exportCollectionAsCSV } from '@/lib/export-collection-csv';
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { edgeFunctionForLiveSource } from '@/lib/live-source-sync';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import { useDuplicateCollection } from '@/hooks/useCollections';
import { useFields } from '@/hooks/useFields';
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
  const { data: fields = [], isLoading: fieldsLoading } = useFields(collection.id);
  const duplicateCollection = useDuplicateCollection();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSync = async () => {
    const fn = edgeFunctionForLiveSource(collection.live_source_type);
    if (!fn) return;
    try {
      const { error, response } = await invokeAuthedEdgeFunction<unknown>(fn, {
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
          <DropdownMenuItem
            disabled={duplicateCollection.isPending}
            onSelect={() => duplicateCollection.mutate({ source: collection })}
          >
            Duplicate
          </DropdownMenuItem>
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
            disabled={fieldsLoading || fields.length === 0}
            onSelect={() => {
              void (async () => {
                if (fields.length === 0) {
                  toast.error('Add at least one field before exporting');
                  return;
                }
                try {
                  await exportCollectionAsCSV(collection, fields);
                  toast.success('CSV downloaded');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Export failed');
                }
              })();
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
