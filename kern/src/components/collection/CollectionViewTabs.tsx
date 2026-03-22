import {
  Calendar,
  Code2,
  Columns2,
  LayoutGrid,
  List,
  Table2,
  Plus,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { Popover } from '@/components/ui/Popover';
import { VIEW_TYPES } from '@/lib/constants';
import { useCreateView, useUpdateView } from '@/hooks/useViews';
import { cn } from '@/lib/utils';
import type { KernView, ViewType } from '@/types/kern';

const VIEW_TYPE_ICONS: Record<ViewType, typeof Table2> = {
  table: Table2,
  kanban: Columns2,
  calendar: Calendar,
  gallery: LayoutGrid,
  list: List,
  custom: Code2,
};

export type CollectionViewTabsProps = {
  views: KernView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  collectionId: string;
};

function AddViewPopover({ collectionId }: { collectionId: string }) {
  const createView = useCreateView();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm text-kern-text-2 transition-colors hover:text-kern-text"
        >
          <Plus size={14} />
          <span>Add view</span>
        </button>
      }
    >
      <div className="min-w-[200px] py-1">
        <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-kern-text-3">
          New view
        </p>
        {VIEW_TYPES.map((vt) => {
          const Icon = VIEW_TYPE_ICONS[vt.type];
          return (
            <button
              key={vt.type}
              type="button"
              className="flex w-full items-center gap-2 rounded-kern-sm px-2 py-2 text-left text-sm text-kern-text hover:bg-kern-surface-2"
              onClick={() => {
                createView.mutate({ collectionId, type: vt.type });
                setOpen(false);
              }}
            >
              <Icon size={14} className="text-kern-text-2" />
              {vt.label}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

export function CollectionViewTabs({
  views,
  activeViewId,
  onViewChange,
  collectionId,
}: CollectionViewTabsProps) {
  const updateView = useUpdateView();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = useCallback((v: KernView) => {
    setRenamingId(v.id);
    setRenameValue(v.name);
  }, []);

  const commitRename = useCallback(
    (viewId: string) => {
      const v = views.find((x) => x.id === viewId);
      if (!v || !renameValue.trim() || renameValue.trim() === v.name) {
        setRenamingId(null);
        return;
      }
      updateView.mutate({
        id: viewId,
        collectionId,
        name: renameValue.trim(),
      });
      setRenamingId(null);
    },
    [views, renameValue, collectionId, updateView]
  );

  return (
    <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
      {views.map((v) => {
        const active = v.id === activeViewId;
        const Icon = VIEW_TYPE_ICONS[v.type];
        return (
          <div
            key={v.id}
            className={cn(
              'flex shrink-0 items-stretch border-b-2 transition-colors',
              active ? 'border-kern-accent' : 'border-transparent'
            )}
          >
            {renamingId === v.id ? (
              <input
                autoFocus
                className="mx-1 my-1 w-[120px] rounded-kern-sm border border-kern-border bg-kern-bg px-2 py-1 text-sm text-kern-text outline-none focus:ring-2 focus:ring-kern-accent/30"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(v.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onViewChange(v.id)}
                onDoubleClick={() => active && startRename(v)}
                className={cn(
                  'flex max-w-[148px] items-center gap-2 px-3 py-2 text-sm transition-colors',
                  active
                    ? 'font-medium text-kern-text'
                    : 'text-kern-text-2 hover:text-kern-text'
                )}
              >
                <Icon size={14} className="shrink-0 opacity-80" />
                <span className="max-w-[120px] truncate">{v.name}</span>
              </button>
            )}
          </div>
        );
      })}
      <AddViewPopover collectionId={collectionId} />
    </div>
  );
}
