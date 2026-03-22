import { Modal } from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/Kbd';

export type KeyboardShortcutsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Row({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-kern-text-2">{label}</span>
      <Kbd className="shrink-0 text-kern-text">{keys}</Kbd>
    </div>
  );
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Quick reference for Kern"
      maxWidth={480}
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-kern-text-3">
            Global
          </p>
          <div className="space-y-2">
            <Row label="Command palette" keys="⌘K" />
            <Row label="Toggle sidebar" keys={'⌘\u005c'} />
            <Row label="Close overlays / palette" keys="Escape" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-kern-text-3">
            Table
          </p>
          <div className="space-y-2">
            <Row label="Expand row" keys="Enter" />
            <Row label="Next cell" keys="Tab" />
            <Row label="Previous cell" keys="Shift+Tab" />
            <Row label="Sort column" keys="Click header" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-kern-text-3">
            Row editor
          </p>
          <div className="space-y-2">
            <Row label="Save" keys="⌘Enter" />
            <Row label="Next field" keys="Tab" />
            <Row label="Close" keys="Escape" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-kern-text-3">
            Collections
          </p>
          <div className="space-y-2">
            <Row label="New collection" keys="⌘N" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
