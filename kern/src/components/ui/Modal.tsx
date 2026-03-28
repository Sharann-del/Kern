import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/** Portaled floating layers (Popover, DropdownMenu, etc.) render outside Dialog.Content; don’t dismiss the modal when using them. */
function isInsideRadixFloatingLayer(node: EventTarget | null): boolean {
  return node instanceof Element && Boolean(node.closest('[data-radix-popper-content-wrapper]'));
}

export type ModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 520,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-kern-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[201] m-4 w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'animate-kern-dialog-in rounded-kern-xl border border-kern-border bg-kern-bg shadow-xl outline-none'
          )}
          style={{ maxWidth }}
          onInteractOutside={(e) => {
            const t = e.detail.originalEvent.target;
            if (isInsideRadixFloatingLayer(t)) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            const t = e.detail.originalEvent.relatedTarget;
            if (isInsideRadixFloatingLayer(t)) e.preventDefault();
          }}
        >
          <div className="flex max-h-[min(90vh,calc(100vh-2rem))] flex-col">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-kern-border px-6 pb-4 pt-5">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-base font-semibold text-kern-text">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-kern-text-2">
                    {description}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </Button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer ? (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-kern-border px-6 pb-5 pt-4">
                {footer}
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
