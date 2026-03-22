import { ArrowRight, X } from 'lucide-react';
import { memo } from 'react';

import type { KernCollection, KernField, KernRow } from '@/types/kern';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export type RelationPillProps = {
  row: KernRow;
  fields: KernField[];
  collectionId: string;
  collection?: Pick<KernCollection, 'icon' | 'color' | 'name'> | null;
  onRemove?: () => void;
  clickable?: boolean;
};

function RelationPillInner({
  row,
  fields,
  collectionId,
  collection,
  onRemove,
  clickable = true,
}: RelationPillProps) {
  const openRow = useAppStore((s) => s.openRow);
  const label = rowPrimaryLabel(row, fields);
  const iconBlock = collection?.icon ? (
    <span className="text-xs leading-none">{collection.icon}</span>
  ) : collection?.color ? (
    <span
      className="h-3 w-3 shrink-0 rounded-kern-sm border border-kern-border"
      style={{ backgroundColor: collection.color }}
      aria-hidden
    />
  ) : null;

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        'group/pill flex max-w-[200px] cursor-pointer items-center gap-1 rounded-kern-sm border border-kern-border bg-kern-surface px-2 py-0.5 text-xs',
        !clickable && 'cursor-default'
      )}
      onClick={() => {
        if (clickable) openRow(row.id, collectionId);
      }}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openRow(row.id, collectionId);
        }
      }}
    >
      {iconBlock}
      <span className="max-w-[120px] truncate font-medium text-kern-text">{label}</span>
      {onRemove ? (
        <button
          type="button"
          className="ml-0.5 shrink-0 rounded p-0.5 text-kern-text-3 opacity-0 hover:bg-kern-surface-2 hover:text-kern-text group-hover/pill:opacity-100"
          aria-label="Remove link"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={8} strokeWidth={2.5} />
        </button>
      ) : (
        <ArrowRight size={8} className="shrink-0 text-kern-text-3 opacity-60" aria-hidden />
      )}
    </div>
  );
}

export const RelationPill = memo(RelationPillInner);
