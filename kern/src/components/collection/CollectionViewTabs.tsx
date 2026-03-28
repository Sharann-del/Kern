import { Calendar, CodeXml, Columns2, LayoutGrid, List, Table2, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  custom: CodeXml,
};

export type CollectionViewTabsProps = {
  views: KernView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  collectionId: string;
  collectionSlug: string;
  /** `boxed`: dark segmented control. `topbarAccent`: centered title-bar strip with accent styling. */
  variant?: 'default' | 'boxed' | 'topbarAccent';
};

function AddViewPopover({
  collectionId,
  collectionSlug,
  boxed,
  topbarAccent,
}: {
  collectionId: string;
  collectionSlug: string;
  boxed?: boolean;
  topbarAccent?: boolean;
}) {
  const createView = useCreateView();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <button
          type="button"
          className={cn(
            'flex shrink-0 items-center gap-1 transition-colors',
            topbarAccent &&
              'rounded-md px-3 py-2 text-sm font-medium text-kern-accent/90 hover:bg-white/[0.06] hover:text-kern-accent',
            boxed &&
              !topbarAccent &&
              'rounded-[4px] px-2 py-1 text-[11px] font-medium text-[#A8A89E] hover:bg-[#353533]/80 hover:text-[#F5F4F0]',
            !boxed && !topbarAccent && 'border-b-2 border-transparent px-3 py-2 text-sm text-kern-text-2 hover:text-kern-text'
          )}
        >
          <Plus size={topbarAccent ? 16 : boxed ? 12 : 14} />
          {boxed || topbarAccent ? (
            <span className="hidden sm:inline">Add</span>
          ) : (
            <span>Add view</span>
          )}
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
                if (vt.type === 'custom') {
                  navigate(`/c/${collectionSlug}/views/custom/new`);
                  setOpen(false);
                  return;
                }
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
  collectionSlug,
  variant = 'default',
}: CollectionViewTabsProps) {
  const boxed = variant === 'boxed';
  const topbarAccent = variant === 'topbarAccent';
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
    <div
      className={cn(
        'flex min-w-0 items-stretch overflow-x-auto',
        topbarAccent &&
          'pointer-events-auto max-w-[min(100vw-10rem,640px)] shrink-0 gap-1 rounded-lg bg-black/35 p-1',
        boxed &&
          !topbarAccent &&
          'shrink-0 gap-0.5 rounded-[6px] border border-[#3f3f3c] bg-[#2c2c2a] p-0.5',
        !boxed && !topbarAccent && 'flex-1 items-stretch'
      )}
    >
      {views.map((v) => {
        const active = v.id === activeViewId;
        const Icon = VIEW_TYPE_ICONS[v.type];
        return (
          <div
            key={v.id}
            className={cn(
              'flex shrink-0 items-stretch transition-colors',
              boxed || topbarAccent
                ? ''
                : active
                  ? 'border-b-2 border-kern-accent'
                  : 'border-b-2 border-transparent'
            )}
          >
            {renamingId === v.id ? (
              <input
                autoFocus
                className={cn(
                  'rounded-kern-sm border px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-kern-accent/30',
                  topbarAccent &&
                    'mx-0.5 my-0.5 w-[min(200px,40vw)] border-0 bg-[#1a1a18] text-sm text-[#F5F4F0] focus-visible:ring-2 focus-visible:ring-kern-accent/35',
                  boxed &&
                    !topbarAccent &&
                    'mx-0.5 my-0.5 w-[100px] border-kern-border bg-kern-bg text-[11px] text-kern-text',
                  !boxed && !topbarAccent && 'mx-1 my-1 w-[120px] border-kern-border bg-kern-bg text-sm text-kern-text'
                )}
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
                  'flex max-w-[148px] items-center gap-1.5 transition-colors',
                  topbarAccent &&
                    cn(
                      'max-w-[200px] gap-2 rounded-md px-3 py-2 text-sm',
                      active
                        ? 'bg-[#32322f] font-semibold text-kern-accent'
                        : 'text-[#A8A89E] hover:bg-white/[0.06] hover:text-kern-accent'
                    ),
                  boxed &&
                    !topbarAccent &&
                    cn(
                      'rounded-[4px] px-2 py-1 text-[11px]',
                      active
                        ? 'bg-[#353533] font-medium text-[#F5F4F0]'
                        : 'text-[#A8A89E] hover:bg-[#353533]/60 hover:text-[#F5F4F0]'
                    ),
                  !boxed &&
                    !topbarAccent &&
                    cn(
                      'gap-2 px-3 py-2 text-sm',
                      active ? 'font-medium text-kern-text' : 'text-kern-text-2 hover:text-kern-text'
                    )
                )}
              >
                <Icon
                  size={topbarAccent ? 16 : boxed ? 12 : 14}
                  className={cn('shrink-0 opacity-80', topbarAccent && active && 'text-kern-accent')}
                />
                <span
                  className={cn(
                    topbarAccent ? 'max-w-[140px] truncate' : boxed ? 'max-w-[88px] truncate' : 'max-w-[120px] truncate'
                  )}
                >
                  {v.name}
                </span>
              </button>
            )}
          </div>
        );
      })}
      <AddViewPopover
        collectionId={collectionId}
        collectionSlug={collectionSlug}
        boxed={boxed && !topbarAccent}
        topbarAccent={topbarAccent}
      />
    </div>
  );
}
