import { useCallback, useState } from 'react';

import { Popover } from '@/components/ui/Popover';
import { EmojiPickerPanel } from '@/components/ui/EmojiPickerPanel';

export type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const pick = useCallback(
    (emoji: string) => {
      onChange(emoji);
      setOpen(false);
    },
    [onChange]
  );

  const display = value || '📦';

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
      }}
      align="start"
      contentClassName="flex min-h-0 min-w-0 max-h-[min(85vh,420px)] flex-col overflow-hidden p-3"
      trigger={
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-kern-md border border-kern-border text-lg leading-none transition-colors hover:bg-kern-surface-2"
          aria-label="Choose emoji"
        >
          {display}
        </button>
      }
    >
      <EmojiPickerPanel
        embedInFlex
        className="min-h-0 flex-1"
        value={value || '📦'}
        onChange={pick}
      />
    </Popover>
  );
}
