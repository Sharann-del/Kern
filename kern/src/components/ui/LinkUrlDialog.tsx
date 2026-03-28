import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export type LinkUrlDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValue: string;
  /** Called when user confirms a URL (trimmed). Empty string means clear the link in the caller. */
  onConfirm: (url: string) => void;
  /** If true, show a control to remove the link without typing. */
  showRemove?: boolean;
  onRemove?: () => void;
};

export function LinkUrlDialog({
  open,
  onOpenChange,
  defaultValue,
  onConfirm,
  showRemove = false,
  onRemove,
}: LinkUrlDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-kern-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[201] m-4 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'rounded-kern-xl border border-kern-border bg-kern-bg p-5 shadow-xl outline-none animate-kern-dialog-in'
          )}
        >
          <Dialog.Title className="text-base font-semibold text-kern-text">Link URL</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-kern-text-2">
            Enter a web address. Include <span className="font-mono text-xs">https://</span> when
            needed.
          </Dialog.Description>
          <div className="mt-4">
            <Input
              label="URL"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              placeholder="https://"
              autoFocus
            />
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Dialog.Close>
            {showRemove && onRemove ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
              >
                Remove link
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onConfirm(value.trim());
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
