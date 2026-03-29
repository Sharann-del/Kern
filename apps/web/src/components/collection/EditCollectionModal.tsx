import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CollectionIconPicker } from '@/components/collection/CollectionIconPicker';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Input } from '@/components/ui/Input';
import { COLLECTION_COLORS } from '@/constants';
import { useUpdateCollection } from '@/hooks/useCollections';
import { cn } from '@/lib/utils';
import type { KernCollection } from '@/types/kern';

export type EditCollectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: KernCollection | null;
};

function EditCollectionModalInner({
  collection,
  onOpenChange,
}: {
  collection: KernCollection;
  onOpenChange: (open: boolean) => void;
}) {
  const updateCollection = useUpdateCollection();

  const [name, setName] = useState(collection.name);
  const [icon, setIcon] = useState(collection.icon ?? '📦');
  const [color, setColor] = useState<string>(collection.color ?? COLLECTION_COLORS[0] ?? '#888888');
  const [description, setDescription] = useState(collection.description ?? '');

  const canSubmit = name.trim().length > 0 && !updateCollection.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || updateCollection.isPending) return;
    updateCollection.mutate(
      {
        id: collection.id,
        slug: collection.slug,
        name: name.trim(),
        icon,
        color,
        description: description.trim() || null,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title="Edit collection"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-collection-form"
            variant="primary"
            loading={updateCollection.isPending}
            disabled={!canSubmit || updateCollection.isPending}
          >
            Save changes
          </Button>
        </>
      }
    >
      <Tooltip.Provider delayDuration={300}>
        <form id="edit-collection-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <CollectionIconPicker value={icon} onChange={setIcon} />
            <div className="min-w-0 flex-1 pt-1">
              <p className="mb-1 text-xs text-kern-text-2">Color</p>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>
          <Input
            label="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
          />
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="w-full">
                <Input
                  label="Slug"
                  value={collection.slug}
                  disabled
                  className="[&_input]:cursor-not-allowed [&_input]:opacity-60"
                />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="z-[120] max-w-xs rounded-kern-md border border-kern-border bg-kern-surface px-2 py-1.5 text-xs text-kern-text shadow-ds-md"
                sideOffset={6}
              >
                Slug cannot be changed after creation
                <Tooltip.Arrow className="fill-kern-border" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <div>
            <label htmlFor="edit-collection-desc" className="mb-1 block text-xs text-kern-text-2">
              Description <span className="text-kern-text-3">(optional)</span>
            </label>
            <textarea
              id="edit-collection-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                'w-full resize-y rounded-kern-md border border-kern-border bg-kern-bg px-3 py-2 text-sm text-kern-text outline-none transition-shadow duration-ds-fast',
                'placeholder:text-kern-text-3',
                'focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30'
              )}
              placeholder="Optional description"
            />
          </div>
        </form>
      </Tooltip.Provider>
    </Modal>
  );
}

export function EditCollectionModal({ open, onOpenChange, collection }: EditCollectionModalProps) {
  if (!open || !collection) {
    return null;
  }

  return <EditCollectionModalInner key={collection.id} collection={collection} onOpenChange={onOpenChange} />;
}
