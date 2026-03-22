import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCollection, useDeleteCollection, type CreateCollectionInput } from '@/hooks/useCollections';
import type { KernCollection } from '@/types/kern';

export type DeleteCollectionDialogProps = {
  collection: KernCollection | null;
  onClose: () => void;
};

function DeleteCollectionDialogInner({
  collection,
  onClose,
}: {
  collection: KernCollection;
  onClose: () => void;
}) {
  const deleteCollection = useDeleteCollection();
  const createCollection = useCreateCollection();
  const [confirm, setConfirm] = useState('');

  const canDelete = confirm === collection.name && !deleteCollection.isPending;

  const handleDelete = () => {
    if (!canDelete) return;
    const snapshot: CreateCollectionInput = {
      name: collection.name,
      slug: collection.slug,
      icon: collection.icon,
      color: collection.color,
      description: collection.description,
    };
    deleteCollection.mutate(
      { id: collection.id },
      {
        onSuccess: () => {
          toast.success(`${collection.name} deleted`, {
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                createCollection.mutate(snapshot, {
                  onSuccess: () => {
                    toast.message('Collection recreated', {
                      description: 'Previous rows, fields, and views were not restored.',
                    });
                  },
                });
              },
            },
          });
          onClose();
        },
      }
    );
  };

  const iconBlock = collection.icon ? (
    <span className="text-3xl leading-none">{collection.icon}</span>
  ) : (
    <span
      className="h-8 w-8 shrink-0 rounded-kern-md border border-kern-border"
      style={{ backgroundColor: collection.color ?? '#888888' }}
      aria-hidden
    />
  );

  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-kern-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] m-4 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-kern-dialog-in rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none">
          <div className="flex items-start gap-3">
            {iconBlock}
            <div className="min-w-0 flex-1">
              <AlertDialog.Title className="text-base font-bold text-kern-text">
                {collection.name}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-3 text-sm text-kern-text-2">
                This will permanently delete all fields, rows, and views in {collection.name}. This
                cannot be undone.
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-6">
            <Input
              label="Type the collection name to confirm:"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder={collection.name}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="danger"
              disabled={!canDelete}
              loading={deleteCollection.isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function DeleteCollectionDialog({ collection, onClose }: DeleteCollectionDialogProps) {
  if (!collection) {
    return null;
  }

  return <DeleteCollectionDialogInner collection={collection} onClose={onClose} />;
}
