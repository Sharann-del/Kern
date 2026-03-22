import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { cn } from '@/lib/utils';
import type { DashboardWidget, DashboardWidgetType } from '@/types/kern';

const TYPE_TITLE: Record<DashboardWidgetType, string> = {
  collection_stats: 'Collection stats',
  recent_rows: 'Recent rows',
  view_embed: 'View embed',
  live_source_status: 'Live source status',
  quick_add: 'Quick add',
};

export type WidgetWrapperProps = {
  widget: DashboardWidget;
  children: ReactNode;
  onDelete: () => void;
};

export function WidgetWrapper({ widget, children, onDelete }: WidgetWrapperProps) {
  const title = widget.title?.trim() || TYPE_TITLE[widget.type];

  const handleRemoveClick = () => {
    const t = window.setTimeout(() => {
      onDelete();
    }, 5000);

    toast('Widget removed', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          window.clearTimeout(t);
        },
      },
    });
  };

  return (
    <section
      className="group flex min-h-0 flex-col overflow-hidden rounded-kern-xl border border-kern-border bg-kern-bg shadow-sm"
      style={{
        gridColumn: `${widget.position_x} / span ${widget.width}`,
        gridRow: `${widget.position_y} / span ${widget.height}`,
      }}
    >
      <header
        className={cn(
          'flex h-10 shrink-0 items-center border-b border-kern-surface-2 px-4 transition-colors',
          'group-hover:border-kern-border'
        )}
      >
        <h3 className="truncate text-sm font-medium text-kern-text">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-6 w-6 shrink-0 p-0 text-kern-danger opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
          aria-label="Remove widget"
          onClick={handleRemoveClick}
        >
          <X size={14} />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </section>
  );
}
