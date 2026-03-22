import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Popover } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'kern-recent-emojis';
const MAX_RECENT = 8;

type EmojiEntry = { emoji: string; label: string };

/** Curated set (~100) with simple search labels. */
const EMOJI_CATALOG: EmojiEntry[] = [
  { emoji: '📦', label: 'package box' },
  { emoji: '📁', label: 'folder' },
  { emoji: '📋', label: 'clipboard' },
  { emoji: '📌', label: 'pin' },
  { emoji: '📍', label: 'location' },
  { emoji: '🔖', label: 'bookmark' },
  { emoji: '🏷️', label: 'label tag' },
  { emoji: '📎', label: 'paperclip' },
  { emoji: '📏', label: 'ruler' },
  { emoji: '📐', label: 'triangle ruler' },
  { emoji: '✂️', label: 'scissors' },
  { emoji: '🗂️', label: 'dividers' },
  { emoji: '📂', label: 'open folder' },
  { emoji: '🎯', label: 'target dart' },
  { emoji: '🎮', label: 'game controller' },
  { emoji: '🎲', label: 'dice' },
  { emoji: '🎨', label: 'palette art' },
  { emoji: '🎭', label: 'theater masks' },
  { emoji: '🎬', label: 'clapper movie' },
  { emoji: '🎤', label: 'microphone' },
  { emoji: '🎸', label: 'guitar' },
  { emoji: '🏋️', label: 'weight lifting' },
  { emoji: '🧘', label: 'yoga meditation' },
  { emoji: '🏃', label: 'running person' },
  { emoji: '⚽', label: 'soccer ball' },
  { emoji: '📚', label: 'books stack' },
  { emoji: '🌱', label: 'seedling plant' },
  { emoji: '🌿', label: 'herb leaf' },
  { emoji: '🍃', label: 'leaf flutter' },
  { emoji: '🌊', label: 'wave water' },
  { emoji: '⛰️', label: 'mountain' },
  { emoji: '🌅', label: 'sunrise' },
  { emoji: '🌙', label: 'moon crescent' },
  { emoji: '⭐', label: 'star' },
  { emoji: '🌸', label: 'cherry blossom' },
  { emoji: '🍀', label: 'clover luck' },
  { emoji: '🦋', label: 'butterfly' },
  { emoji: '🐱', label: 'cat' },
  { emoji: '🐶', label: 'dog' },
  { emoji: '🍎', label: 'apple fruit' },
  { emoji: '🥑', label: 'avocado' },
  { emoji: '🍕', label: 'pizza' },
  { emoji: '☕', label: 'coffee' },
  { emoji: '🍵', label: 'tea' },
  { emoji: '🥤', label: 'cup straw' },
  { emoji: '🍰', label: 'cake' },
  { emoji: '🍓', label: 'strawberry' },
  { emoji: '✅', label: 'check mark' },
  { emoji: '❌', label: 'cross no' },
  { emoji: '⚡', label: 'lightning bolt' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '💡', label: 'light bulb idea' },
  { emoji: '🔑', label: 'key' },
  { emoji: '🛡️', label: 'shield' },
  { emoji: '⚙️', label: 'gear settings' },
  { emoji: '🔔', label: 'bell' },
  { emoji: '💬', label: 'speech bubble' },
  { emoji: '📊', label: 'bar chart' },
  { emoji: '📈', label: 'trending up' },
  { emoji: '💰', label: 'money bag' },
  { emoji: '🏆', label: 'trophy' },
  { emoji: '😊', label: 'smile happy' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '💪', label: 'muscle strong' },
  { emoji: '🎉', label: 'party celebrate' },
  { emoji: '🚀', label: 'rocket launch' },
  { emoji: '💎', label: 'gem diamond' },
  { emoji: '🌟', label: 'glowing star' },
  { emoji: '❤️', label: 'heart love' },
  { emoji: '📝', label: 'memo write' },
  { emoji: '✏️', label: 'pencil' },
  { emoji: '🖊️', label: 'pen' },
  { emoji: '🗓️', label: 'calendar' },
  { emoji: '⏰', label: 'alarm clock' },
  { emoji: '💼', label: 'briefcase work' },
  { emoji: '🏠', label: 'home house' },
  { emoji: '🌍', label: 'globe world' },
  { emoji: '🧭', label: 'compass' },
  { emoji: '🛠️', label: 'tools hammer' },
  { emoji: '🔧', label: 'wrench' },
  { emoji: '🧩', label: 'puzzle piece' },
  { emoji: '🎁', label: 'gift' },
  { emoji: '🧠', label: 'brain' },
  { emoji: '👋', label: 'wave hand' },
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '✨', label: 'sparkles' },
  { emoji: '📱', label: 'mobile phone' },
  { emoji: '💻', label: 'laptop computer' },
  { emoji: '🖥️', label: 'desktop monitor' },
  { emoji: '⌨️', label: 'keyboard' },
  { emoji: '🗄️', label: 'file cabinet' },
  { emoji: '📧', label: 'email mail' },
  { emoji: '🔗', label: 'link chain' },
  { emoji: '🧾', label: 'receipt' },
  { emoji: '💳', label: 'credit card' },
  { emoji: '🏁', label: 'finish flag' },
  { emoji: '🎪', label: 'circus tent' },
  { emoji: '🎧', label: 'headphones' },
  { emoji: '🎹', label: 'piano' },
  { emoji: '🎺', label: 'trumpet' },
  { emoji: '🏖️', label: 'beach umbrella' },
  { emoji: '🌴', label: 'palm tree' },
  { emoji: '🌵', label: 'cactus' },
  { emoji: '🍇', label: 'grapes' },
  { emoji: '🍊', label: 'orange fruit' },
  { emoji: '🥕', label: 'carrot' },
  { emoji: '🍔', label: 'burger' },
  { emoji: '🌮', label: 'taco' },
  { emoji: '🍣', label: 'sushi' },
  { emoji: '🍪', label: 'cookie' },
  { emoji: '🧁', label: 'cupcake' },
  { emoji: '☀️', label: 'sun' },
  { emoji: '⛈️', label: 'storm cloud' },
  { emoji: '🌈', label: 'rainbow' },
  { emoji: '🔮', label: 'crystal ball' },
  { emoji: '🧿', label: 'nazar' },
  { emoji: '🎵', label: 'music note' },
  { emoji: '🎶', label: 'music notes' },
  { emoji: '🏷', label: 'tag' },
  { emoji: '📑', label: 'bookmark tabs' },
  { emoji: '🗃️', label: 'card box' },
  { emoji: '📆', label: 'calendar' },
  { emoji: '✈️', label: 'airplane' },
  { emoji: '🚗', label: 'car' },
  { emoji: '🚲', label: 'bicycle' },
];

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecent(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(emojis.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => readRecent());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_CATALOG;
    return EMOJI_CATALOG.filter(
      (e) =>
        e.label.includes(q) ||
        e.emoji.includes(q) ||
        [...e.emoji].some((ch) => ch.toLowerCase().includes(q))
    );
  }, [query]);

  const recentEntries = useMemo(() => {
    return recent
      .map((ch) => EMOJI_CATALOG.find((e) => e.emoji === ch) ?? { emoji: ch, label: ch })
      .filter((e) => e.emoji);
  }, [recent]);

  const pick = useCallback(
    (emoji: string) => {
      onChange(emoji);
      const next = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, MAX_RECENT);
      setRecent(next);
      writeRecent(next);
      setOpen(false);
      setQuery('');
    },
    [onChange, recent]
  );

  const display = value || '📦';

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery('');
      }}
      align="start"
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
      <div className="w-[300px]">
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-kern-text-3"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-kern-md border border-kern-border bg-kern-bg py-1 pl-8 pr-2 text-sm text-kern-text outline-none focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30"
          />
        </div>
        {recentEntries.length > 0 && !query.trim() ? (
          <div className="mb-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-kern-text-3">
              Recently used
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {recentEntries.map((e) => (
                <button
                  key={`r-${e.emoji}`}
                  type="button"
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-kern-sm text-base transition-colors hover:bg-kern-surface-2'
                  )}
                  onClick={() => pick(e.emoji)}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="max-h-[240px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-0.5">
            {filtered.map((e) => (
              <button
                key={e.emoji + e.label}
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-kern-sm text-base transition-colors hover:bg-kern-surface-2"
                onClick={() => pick(e.emoji)}
              >
                {e.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Popover>
  );
}
