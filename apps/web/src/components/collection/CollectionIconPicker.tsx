import { useMemo, useState } from 'react';

import {
  COLLECTION_EMOJI_OPTIONS,
  type CollectionEmojiOption,
} from '@/components/collection/collectionEmojiPresets';
import { CollectionIconDisplay } from '@/components/collection/CollectionIconDisplay';
import { COLLECTION_LUCIDE_OPTIONS } from '@/components/collection/collectionLucideIcons';
import type { CollectionLucideOption } from '@/components/collection/collectionLucideIcons';
import { Popover } from '@/components/ui/Popover';
import { Input } from '@/components/ui/Input';
import { formatStoredLucideIcon, isLucideIconStored, lucideIconNameFromStored } from '@/lib/collectionIcon';
import { cn } from '@/lib/utils';

type Tab = 'emoji' | 'icon';

function matchesEmojiSearch(opt: CollectionEmojiOption, raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (opt.emoji === trimmed) return true;
  const t = trimmed.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every((w) => opt.q.includes(w));
}

function matchesIconSearch(opt: CollectionLucideOption, raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const t = trimmed.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${opt.label} ${opt.name}`.toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2');
  return words.every((w) => hay.includes(w));
}

export type CollectionIconPickerProps = {
  value: string | null;
  onChange: (icon: string) => void;
  /** Tints Lucide glyphs in the preview and grid. */
  color?: string | null;
  disabled?: boolean;
};

export function CollectionIconPicker({ value, onChange, color, disabled }: CollectionIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() =>
    value && isLucideIconStored(value) ? 'icon' : 'emoji'
  );
  const [query, setQuery] = useState('');

  const activeLucideName = lucideIconNameFromStored(value);
  const activeEmoji = value && !isLucideIconStored(value) ? value : null;

  const filteredEmojis = useMemo(
    () => COLLECTION_EMOJI_OPTIONS.filter((o) => matchesEmojiSearch(o, query)),
    [query]
  );

  const filteredIcons = useMemo(
    () => COLLECTION_LUCIDE_OPTIONS.filter((o) => matchesIconSearch(o, query)),
    [query]
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setTab(value && isLucideIconStored(value) ? 'icon' : 'emoji');
        } else {
          setQuery('');
        }
      }}
      align="start"
      contentClassName="w-[min(calc(100vw-3rem),380px)] p-2"
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-label="Choose collection icon"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-kern-md border border-kern-border bg-kern-surface transition-colors',
            'hover:bg-kern-surface-2 focus-visible:outline-none focus-visible:ring-0',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <CollectionIconDisplay icon={value} color={color} size={22} />
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'emoji' ? 'Search emojis…' : 'Search icons…'}
          autoComplete="off"
          className="text-sm"
          aria-label={tab === 'emoji' ? 'Search emojis' : 'Search icons'}
        />

        <div className="flex rounded-kern-md border border-kern-border p-0.5">
          <button
            type="button"
            onClick={() => {
              setTab('emoji');
              setQuery('');
            }}
            className={cn(
              'flex-1 rounded-kern-sm px-2 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-0',
              tab === 'emoji' ? 'bg-kern-accent text-kern-on-accent' : 'text-kern-text-2'
            )}
          >
            Emoji
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('icon');
              setQuery('');
            }}
            className={cn(
              'flex-1 rounded-kern-sm px-2 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-0',
              tab === 'icon' ? 'bg-kern-accent text-kern-on-accent' : 'text-kern-text-2'
            )}
          >
            Icons
          </button>
        </div>

        {tab === 'emoji' ? (
          <div
            className="max-h-[min(55vh,340px)] min-h-0 overflow-y-auto overscroll-y-contain pr-0.5"
            onWheel={(e) => e.stopPropagation()}
          >
            {filteredEmojis.length === 0 ? (
              <p className="py-6 text-center text-sm text-kern-text-3">No emojis match your search.</p>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map((row) => {
                  const selected = activeEmoji === row.emoji;
                  return (
                    <button
                      key={row.emoji}
                      type="button"
                      title={row.q.split(' ').slice(0, 4).join(', ')}
                      onClick={() => {
                        onChange(row.emoji);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-kern-sm text-lg leading-none transition-colors',
                        'hover:bg-kern-surface-2 focus-visible:outline-none focus-visible:ring-0',
                        selected && 'border border-kern-border bg-kern-surface-2'
                      )}
                    >
                      {row.emoji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div
            className="max-h-[min(55vh,340px)] min-h-0 overflow-y-auto overscroll-y-contain pr-0.5"
            onWheel={(e) => e.stopPropagation()}
          >
            {filteredIcons.length === 0 ? (
              <p className="py-6 text-center text-sm text-kern-text-3">No icons match your search.</p>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-8">
                {filteredIcons.map(({ name, label, Icon }) => {
                  const selected = activeLucideName === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={label}
                      onClick={() => {
                        onChange(formatStoredLucideIcon(name));
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-kern-sm text-kern-text-2 transition-colors',
                        'hover:bg-kern-surface-2 hover:text-kern-text focus-visible:outline-none focus-visible:ring-0',
                        selected && 'border border-kern-border bg-kern-surface-2 text-kern-text'
                      )}
                    >
                      <Icon size={18} style={color ? { color } : undefined} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Popover>
  );
}
