import { Modal } from '@/components/ui/Modal';

type ConnectLiveSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Placeholder — Phase 2 live source connection. */
export function ConnectLiveSourceModal({ open, onOpenChange }: ConnectLiveSourceModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Connect live source"
      description="Live source setup will be available in Phase 2."
      footer={
        <button
          type="button"
          className="rounded-kern-md border border-kern-border px-3 py-1.5 text-sm text-kern-text hover:bg-kern-surface-2"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      }
    >
      <p className="text-sm text-kern-text-2">This feature is not implemented yet.</p>
    </Modal>
  );
}
