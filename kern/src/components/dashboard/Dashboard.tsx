import { LayoutDashboard } from 'lucide-react';

import { WidgetWrapper } from '@/components/dashboard/WidgetWrapper';
import { CollectionStatsWidget } from '@/components/dashboard/widgets/CollectionStatsWidget';
import { LiveSourceStatusWidget } from '@/components/dashboard/widgets/LiveSourceStatusWidget';
import { QuickAddWidget } from '@/components/dashboard/widgets/QuickAddWidget';
import { RecentRowsWidget } from '@/components/dashboard/widgets/RecentRowsWidget';
import { ViewEmbedWidget } from '@/components/dashboard/widgets/ViewEmbedWidget';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteWidget, useWidgets } from '@/hooks/useDashboard';
import type { DashboardWidget } from '@/types/kern';

function renderWidget(widget: DashboardWidget) {
  switch (widget.type) {
    case 'collection_stats':
      return (
        <CollectionStatsWidget
          config={widget.config as { collection_id: string }}
        />
      );
    case 'recent_rows':
      return (
        <RecentRowsWidget
          config={widget.config as {
            collection_id: string;
            limit: number;
            show_fields: string[];
          }}
        />
      );
    case 'view_embed':
      return (
        <ViewEmbedWidget
          config={widget.config as { collection_id: string; view_id: string }}
        />
      );
    case 'live_source_status':
      return (
        <LiveSourceStatusWidget
          config={widget.config as { collection_id: string }}
        />
      );
    case 'quick_add':
      return (
        <QuickAddWidget
          config={widget.config as {
            collection_id: string;
            prefill?: Record<string, unknown>;
          }}
        />
      );
    default:
      return <p className="text-xs text-kern-text-3">Unsupported widget type.</p>;
  }
}

export type DashboardProps = {
  onOpenAddWidget: () => void;
};

export function Dashboard({ onOpenAddWidget }: DashboardProps) {
  const { data: widgets = [], isLoading } = useWidgets();
  const deleteWidget = useDeleteWidget();

  return (
    <div className="min-h-full p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-kern-text">Dashboard</h1>
        <Button type="button" variant="secondary" size="sm" onClick={onOpenAddWidget}>
          + Add widget
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-kern-text-2">Loading…</p>
      ) : widgets.length === 0 ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Build your dashboard"
          subtitle="Add widgets to see your data at a glance"
          actionLabel="Add widget"
          onAction={onOpenAddWidget}
        />
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridAutoRows: 'minmax(128px, auto)',
          }}
        >
          {widgets.map((widget) => (
            <WidgetWrapper
              key={widget.id}
              widget={widget}
              onDelete={() => deleteWidget.mutate({ id: widget.id })}
            >
              {renderWidget(widget)}
            </WidgetWrapper>
          ))}
        </div>
      )}
    </div>
  );
}
