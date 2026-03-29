import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { VARIANTS } from '@/lib/animations';
import { cn } from '@/lib/utils';

const overlayZ = 'z-[200]';
const contentZ = 'z-[201]';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: 'danger' | 'primary';
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay forceMount asChild>
          <motion.div
            className={cn(
              'fixed inset-0 bg-black/50 backdrop-blur-sm',
              overlayZ,
              !open && 'pointer-events-none'
            )}
            variants={VARIANTS.fade}
            initial="hidden"
            animate={open ? 'visible' : 'hidden'}
          />
        </AlertDialog.Overlay>
        <AlertDialog.Content forceMount asChild>
          <motion.div
            className={cn(
              'fixed left-1/2 top-1/2 m-4 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none',
              contentZ,
              !open && 'pointer-events-none'
            )}
            variants={VARIANTS.fadeUp}
            initial="hidden"
            animate={open ? 'visible' : 'hidden'}
          >
          <AlertDialog.Title className="text-base font-semibold text-kern-text">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-kern-text-2">{description}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" disabled={loading}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              loading={loading}
              onClick={() => onConfirm()}
            >
              {confirmLabel}
            </Button>
          </div>
          </motion.div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
