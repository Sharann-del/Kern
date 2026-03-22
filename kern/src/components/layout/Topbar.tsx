import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/components/layout/UserMenu';
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
  const activeCollectionSlug = useAppStore((s) => s.activeCollectionSlug);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center border-b border-kern-border bg-kern-bg px-3">
      <div className="flex min-w-0 flex-1 items-center">
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="h-8 w-8 shrink-0 p-0"
          onClick={() => toggleSidebar()}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </Button>
        <span className="ml-2 font-mono text-lg font-bold text-kern-accent">kern</span>
        {activeCollectionSlug ? (
          <span className="truncate text-kern-text-2">
            {' '}
            / {formatCollectionBreadcrumb(activeCollectionSlug)}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <UserMenu />
      </div>
    </header>
  );
}
