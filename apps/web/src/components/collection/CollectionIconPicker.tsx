import * as Tabs from '@radix-ui/react-tabs';
import { useEffect, useState } from 'react';

import { CollectionIconDisplay } from '@/components/collection/CollectionIconDisplay';
import { LucideIconPickerPanel } from '@/components/collection/LucideIconPickerPanel';
import { Popover } from '@/components/ui/Popover';
import { EmojiPickerPanel } from '@/components/ui/EmojiPickerPanel';
import { formatStoredLucideIcon, isLucideIconStored, lucideIconNameFromStored } from '@/lib/collectionIcon';
import { cn } from '@/lib/utils';

const DEFAULT_EMOJI = '📦';
const DEFAULT_LUCIDE = 'Table2';

export type CollectionIconPickerProps = {
  value: string;
  onChange: (stored: string) => void;
  className?: string;
};

export function CollectionIconPicker({ value, onChange, className }: CollectionIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'emoji' | 'icon'>('emoji');

  useEffect(() => {
    if (!open) return;
    setTab(isLucideIconStored(value) ? 'icon' : 'emoji');
  }, [open, value]);

  const lucideName = lucideIconNameFromStored(value) ?? DEFAULT_LUCIDE;
  const emojiValue = isLucideIconStored(value) ? DEFAULT_EMOJI : value || DEFAULT_EMOJI;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <p className="text-xs text-kern-text-2">Icon</p>
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="start"
        contentClassName="flex max-h-[min(85vh,480px)] min-h-0 min-w-0 flex-col overflow-hidden p-3"
        trigger={
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-kern-md border border-kern-border text-kern-text transition-colors hover:bg-kern-surface-2"
            aria-label="Choose collection icon"
          >
            <CollectionIconDisplay icon={value || null} size={22} />
          </button>
        }
      >
        <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'emoji' | 'icon')} className="flex min-h-0 flex-col">
          <Tabs.List className="mb-3 flex shrink-0 gap-1 rounded-kern-md bg-kern-surface p-0.5">
            <Tabs.Trigger
              value="emoji"
              className={cn(
                'flex-1 rounded-kern-sm px-2 py-1.5 text-xs font-medium transition-colors',
                'text-kern-text-2 outline-none data-[state=active]:bg-kern-bg data-[state=active]:text-kern-text',
                'hover:text-kern-text'
              )}
            >
              Emoji
            </Tabs.Trigger>
            <Tabs.Trigger
              value="icon"
              className={cn(
                'flex-1 rounded-kern-sm px-2 py-1.5 text-xs font-medium transition-colors',
                'text-kern-text-2 outline-none data-[state=active]:bg-kern-bg data-[state=active]:text-kern-text',
                'hover:text-kern-text'
              )}
            >
              Icon
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content
            value="emoji"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <EmojiPickerPanel
              embedInFlex
              value={emojiValue}
              onChange={(emoji) => onChange(emoji)}
              onPicked={() => setOpen(false)}
            />
          </Tabs.Content>
          <Tabs.Content
            value="icon"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <LucideIconPickerPanel
              embedInFlex
              value={lucideName}
              onChange={(name) => onChange(formatStoredLucideIcon(name))}
              onPicked={() => setOpen(false)}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Popover>
    </div>
  );
}
