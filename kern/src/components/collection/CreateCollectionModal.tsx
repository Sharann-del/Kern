import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { Input } from '@/components/ui/Input';
import { COLLECTION_COLORS } from '@/constants';
import { useCreateCollection } from '@/hooks/useCollections';
import { supabase } from '@/lib/supabase';
import { slugify, cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

export type CreateCollectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CreateCollectionModalForm({ onOpenChange }: Pick<CreateCollectionModalProps, 'onOpenChange'>) {
  const { user } = useAuth();
  const userId = user?.id;
  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState<string>(COLLECTION_COLORS[0] ?? '#888888');
  const [description, setDescription] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSlugManuallyEdited(false);
      setSlug('');
      return;
    }
    if (!slugManuallyEdited) {
      setSlug(slugify(trimmed));
    }
  }, [name, slugManuallyEdited]);

  const runSlugValidation = useCallback(
    async (raw: string) => {
      const t = raw.trim();
      if (!t) {
        setSlugError(null);
        return;
      }
      if (!/^[a-z0-9-]+$/.test(t)) {
        setSlugError('Use only lowercase letters, numbers, and hyphens.');
        return;
      }
      if (t.length > 60) {
        setSlugError('Slug must be 60 characters or less.');
        return;
      }
      if (!userId) {
        setSlugError(null);
        return;
      }
      setIsValidating(true);
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id')
          .eq('user_id', userId)
          .eq('slug', t)
          .maybeSingle();
        if (error) throw error;
        if (data) setSlugError('This slug is already taken');
        else setSlugError(null);
      } catch {
        setSlugError('Could not validate slug. Try again.');
      } finally {
        setIsValidating(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!slug.trim()) {
      setSlugError(null);
      setIsValidating(false);
      return;
    }
    const t = setTimeout(() => {
      void runSlugValidation(slug);
    }, 400);
    return () => clearTimeout(t);
  }, [slug, runSlugValidation]);

  const handleSlugBlur = () => {
    void runSlugValidation(slug);
  };

  const canSubmit =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    !slugError &&
    !isValidating &&
    /^[a-z0-9-]+$/.test(slug.trim()) &&
    slug.trim().length <= 60;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createCollection.isPending) return;
    createCollection.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        icon,
        color,
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(`${icon} ${name.trim()} created`);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      title="New collection"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-collection-form"
            variant="primary"
            loading={createCollection.isPending}
            disabled={!canSubmit || createCollection.isPending}
          >
            Create collection
          </Button>
        </>
      }
    >
      <form id="create-collection-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <EmojiPicker value={icon} onChange={setIcon} />
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
          autoFocus
          autoComplete="off"
        />
        <div>
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setSlug(e.target.value);
            }}
            onBlur={handleSlugBlur}
            error={slugError ?? undefined}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-kern-text-3">kern.app/c/{slug.trim() || '…'}</p>
        </div>
        <div>
          <label htmlFor="create-collection-desc" className="mb-1 block text-xs text-kern-text-2">
            Description <span className="text-kern-text-3">(optional)</span>
          </label>
          <textarea
            id="create-collection-desc"
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
    </Modal>
  );
}

export function CreateCollectionModal({ open, onOpenChange }: CreateCollectionModalProps) {
  if (!open) {
    return null;
  }

  return <CreateCollectionModalForm onOpenChange={onOpenChange} />;
}
