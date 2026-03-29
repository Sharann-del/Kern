import { Menu } from 'lucide-react';

import { UserMenu } from '@/components/layout/UserMenu';
import { useCollectionChromeNodeOptional } from '@/contexts/CollectionChromeContext';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

function formatCollectionBreadcrumb(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Topbar() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const activeCollectionSlug = useAppStore((s) => s.activeCollectionSlug);
  const collectionChrome = useCollectionChromeNodeOptional();

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 grid min-h-[var(--layout-topbar-h)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-[#2A2A28] bg-[#222220] box-border px-2 py-1 sm:px-3'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className={cn(
            'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent text-[#6B6B64] transition-[background-color,color] duration-[80ms] ease-in-out',
            'hover:bg-[#353533] hover:text-[#A8A89E]'
          )}
          onClick={() => toggleSidebar()}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          <Menu size={18} strokeWidth={2} className="shrink-0" />
        </button>

        <span
          className="instrument-serif-regular ml-1 select-none text-[17px] font-normal leading-none tracking-[-0.02em] text-[#F5F4F0]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          kern
        </span>

        {activeCollectionSlug ? (
          <>
            <span className="mx-0.5 shrink-0 text-[13px] text-[#6B6B64]" aria-hidden>
              /
            </span>
            <span className="min-w-0 max-w-[min(28vw,160px)] shrink truncate text-[13px] font-medium text-[#A8A89E] sm:max-w-[200px]">
              {formatCollectionBreadcrumb(activeCollectionSlug)}
            </span>
          </>
        ) : null}
      </div>

      <div className="pointer-events-none flex min-w-0 justify-center justify-self-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {collectionChrome ? (
          <div className="flex min-h-0 min-w-0 items-center">{collectionChrome}</div>
        ) : null}
      </div>

      <div className="flex min-w-0 justify-end">
        <UserMenu />
      </div>
    </header>
  );
}
