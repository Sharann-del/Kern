import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { COLLECTION_LUCIDE_OPTIONS } from '@/components/collection/collectionLucideIcons';
import { cn } from '@/lib/utils';

export type LucideIconPickerPanelProps = {
  /** Lucide export name, e.g. `Table2` */
  value: string;
  onChange: (lucideName: string) => void;
  onPicked?: () => void;
  /** See EmojiPickerPanel `embedInFlex`. */
  embedInFlex?: boolean;
  className?: string;
};

export function LucideIconPickerPanel({
  value,
  onChange,
  onPicked,
  embedInFlex = false,
  className,
}: LucideIconPickerPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COLLECTION_LUCIDE_OPTIONS;
    return COLLECTION_LUCIDE_OPTIONS.filter(
      (o) => o.label.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div
      className={cn(
        'flex min-h-0 w-[300px] min-w-0 flex-col',
        embedInFlex && 'min-h-0 flex-1',
        className
      )}
    >
      <div className="relative mb-2 shrink-0">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-kern-text-3"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="h-8 w-full rounded-kern-md border border-kern-border bg-kern-bg py-1 pl-8 pr-2 text-sm text-kern-text outline-none focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30"
        />
      </div>
      <div
        className={cn(
          'kern-popover-scroll min-h-0',
          embedInFlex ? 'flex-1' : 'max-h-[min(55vh,380px)] min-h-[min(180px,38vh)] shrink-0'
        )}
      >
        <div className="grid grid-cols-6 gap-1">
          {filtered.map(({ name, label, Icon }) => (
            <button
              key={name}
              type="button"
              title={label}
              className={cn(
                'flex h-10 w-full items-center justify-center rounded-kern-md border border-transparent text-kern-text-2 transition-colors hover:border-kern-border hover:bg-kern-surface-2 hover:text-kern-text',
                value === name && 'border-kern-accent/40 bg-kern-accent/10 text-kern-accent'
              )}
              onClick={() => {
                onChange(name);
                onPicked?.();
              }}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
