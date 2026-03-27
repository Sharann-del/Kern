import * as Dialog from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { createOnboardingCollection, type OnboardingTemplateId } from '@/lib/create-onboarding-collection';
import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/stores/appStore';

export type WelcomeOnboardingModalProps = {
  open: boolean;
};

export function WelcomeOnboardingModal({ open }: WelcomeOnboardingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const openCreateCollectionModal = useAppStore((s) => s.openCreateCollectionModal);
  const [busy, setBusy] = useState(false);

  const runTemplate = async (template: OnboardingTemplateId) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const { slug } = await createOnboardingCollection(user.id, template);
      void queryClient.invalidateQueries({ queryKey: ['collections', user.id] });
      navigate(`/c/${slug}`);
      toast.success(template === 'books' ? 'Books collection created' : 'Tasks collection created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create collection');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-kern-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[101] m-4 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'animate-kern-dialog-in rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none',
            'focus:outline-none'
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <Dialog.Title className="text-lg font-semibold text-kern-text">Welcome to Kern</Dialog.Title>
          <p className="mt-2 text-sm text-kern-text-2">
            You define the structure. Let&apos;s create your first collection.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runTemplate('books')}
              className={cn(
                'flex w-full items-start gap-3 rounded-kern-lg border border-kern-border bg-kern-surface p-4 text-left outline-none transition-colors',
                'hover:bg-kern-surface-2 focus-visible:ring-2 focus-visible:ring-kern-accent/30',
                'disabled:opacity-50'
              )}
              aria-label="Create Books and Reading collection"
            >
              <span className="text-2xl leading-none" aria-hidden>
                📚
              </span>
              <span>
                <span className="block text-sm font-medium text-kern-accent">Books &amp; Reading</span>
                <span className="mt-0.5 block text-xs text-kern-text-3">
                  Title, author, status, rating, date finished
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runTemplate('tasks')}
              className={cn(
                'flex w-full items-start gap-3 rounded-kern-lg border border-kern-border bg-kern-surface p-4 text-left outline-none transition-colors',
                'hover:bg-kern-surface-2 focus-visible:ring-2 focus-visible:ring-kern-accent/30',
                'disabled:opacity-50'
              )}
              aria-label="Create Tasks and Projects collection"
            >
              <span className="text-2xl leading-none" aria-hidden>
                🎯
              </span>
              <span>
                <span className="block text-sm font-medium text-[#6366f1]">Tasks &amp; Projects</span>
                <span className="mt-0.5 block text-xs text-kern-text-3">
                  Title, status, due date, priority
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => openCreateCollectionModal()}
              className={cn(
                'flex w-full items-start gap-3 rounded-kern-lg border border-kern-border bg-kern-surface p-4 text-left outline-none transition-colors',
                'hover:bg-kern-surface-2 focus-visible:ring-2 focus-visible:ring-kern-accent/30',
                'disabled:opacity-50'
              )}
              aria-label="Start from scratch with empty collection"
            >
              <span className="text-2xl leading-none" aria-hidden>
                📦
              </span>
              <span>
                <span className="block text-sm font-medium text-kern-text-2">Start from scratch</span>
                <span className="mt-0.5 block text-xs text-kern-text-3">Open the create collection dialog</span>
              </span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
