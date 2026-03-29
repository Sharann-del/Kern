import { LayoutGrid, Plus } from 'lucide-react';
import { useMemo } from 'react';

import { GalleryCard } from '@/components/views/GalleryView/GalleryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCreateRow } from '@/hooks/useRows';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernRow, ViewConfig } from '@/types/kern';

export type GalleryViewProps = {
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  collectionId: string;
  collection: KernCollection;
};

const SIZE_GRID: Record<ViewConfig['gallery_card_size'], string> = {
  small: 'grid-cols-1 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-5',
  medium: 'grid-cols-1 min-[480px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-4',
  large: 'grid-cols-1 min-[480px]:grid-cols-2 min-[900px]:grid-cols-2 min-[1280px]:grid-cols-3',
};

export function GalleryView({ rows, fields, viewConfig, collectionId, collection }: GalleryViewProps) {
  const createRow = useCreateRow();
  const openRow = useAppStore((s) => s.openRow);
  const size = viewConfig.gallery_card_size ?? 'medium';
  const cover = viewConfig.gallery_cover_field;
  const cardSlugs = viewConfig.gallery_card_fields ?? [];

  const gridClass = SIZE_GRID[size] ?? SIZE_GRID.medium;

  const addRow = () => {
    createRow.mutate(
      { collectionId, data: {} },
      {
        onSuccess: (r) => openRow(r.id, collectionId),
      }
    );
  };

  const empty = useMemo(() => rows.length === 0, [rows.length]);

  if (empty) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No rows yet"
        subtitle="Add a row or use the card below to create one."
        actionLabel="Add row"
        onAction={addRow}
      />
    );
  }

  return (
    <div className={cn('grid gap-4', gridClass)}>
      {rows.map((row) => (
        <GalleryCard
          key={row.id}
          row={row}
          fields={fields}
          coverFieldSlug={cover}
          cardFieldSlugs={cardSlugs}
          collectionId={collectionId}
          collection={collection}
        />
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={createRow.isPending}
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-kern-xl border-2 border-dashed border-kern-border',
          'bg-kern-bg text-sm text-kern-text-2 transition-colors hover:border-kern-accent hover:text-kern-accent'
        )}
      >
        <Plus className="h-8 w-8" aria-hidden />
        <span>Add row</span>
      </button>
    </div>
  );
}
