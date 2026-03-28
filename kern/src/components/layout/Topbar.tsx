import { PanelLeft } from 'lucide-react';

import { UserMenu } from '@/components/layout/UserMenu';
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

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 flex h-[44px] items-center gap-2 border-b border-[#2A2A28] bg-[#222220] px-3'
      )}
    >
      <button
        type="button"
        className={cn(
          'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent text-[#6B6B64] transition-[background-color,color] duration-[80ms] ease-in-out',
          'hover:bg-[#353533] hover:text-[#A8A89E]'
        )}
        onClick={() => toggleSidebar()}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeft size={15} strokeWidth={1.75} className="shrink-0" />
      </button>

      <span
        className="instrument-serif-regular ml-1 select-none text-[17px] font-normal leading-none tracking-[-0.02em] text-[#F5F4F0]"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
      >
        kern
      </span>

      <div
        className={cn(
          'flex min-w-0 flex-1 items-center transition-opacity duration-150',
          activeCollectionSlug ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {activeCollectionSlug ? (
          <>
            <span className="mx-1 shrink-0 text-[13px] text-[#6B6B64]" aria-hidden>
              /
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium text-[#A8A89E]">
              {formatCollectionBreadcrumb(activeCollectionSlug)}
            </span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}
