import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

import { CollectionIconDisplay } from '@/components/collection/CollectionIconDisplay';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCollection, useDeleteCollection, type CreateCollectionInput } from '@/hooks/useCollections';
import { VARIANTS } from '@/lib/animations';
import { cn } from '@/lib/utils';
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
  const [confirmName, setConfirmName] = useState('');

  const nameMatches =
    confirmName.trim().length > 0 && confirmName.trim() === collection.name.trim();
  const canDelete = nameMatches && !deleteCollection.isPending;

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

  const iconBlock = (
    <CollectionIconDisplay
      icon={collection.icon}
      color={collection.icon ? (collection.color ?? undefined) : (collection.color ?? '#888888')}
      size={36}
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
        <AlertDialog.Overlay forceMount asChild>
          <motion.div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            variants={VARIANTS.fade}
            initial="hidden"
            animate="visible"
          />
        </AlertDialog.Overlay>
        <AlertDialog.Content forceMount asChild>
          <motion.div
            className={cn(
              'fixed left-1/2 top-1/2 z-[201] m-4 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none'
            )}
            variants={VARIANTS.fadeUp}
            initial="hidden"
            animate="visible"
          >
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
              label="Type the collection name to confirm"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              placeholder={collection.name}
            />
            <p className="mt-2 text-xs text-kern-text-3">
              Delete stays disabled until the name matches exactly (including spaces).
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                type="button"
                variant="danger"
                disabled={!canDelete}
                loading={deleteCollection.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                Delete
              </Button>
            </AlertDialog.Action>
          </div>
          </motion.div>
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
