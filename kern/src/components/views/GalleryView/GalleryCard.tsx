import { useMemo } from 'react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { useFileUrl } from '@/hooks/useFileUrl';
import { formatCellValueForCard } from '@/lib/formatCellDisplay';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernRow } from '@/types/kern';

type FileEntry = { name?: string; url?: string };

function asFiles(value: unknown): FileEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is FileEntry => x !== null && typeof x === 'object');
}

function firstImageFileRef(value: unknown): { url: string; name?: string } | null {
  const files = asFiles(value);
  for (const f of files) {
    const u = f.url;
    if (typeof u !== 'string' || !u.trim()) continue;
    const hint = `${f.name ?? ''} ${u}`.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg|avif)(\?|#|$)/i.test(hint) || /^https?:\/\//i.test(u)) {
      return { url: u.trim(), name: f.name };
    }
  }
  return files[0]?.url ? { url: String(files[0].url), name: files[0].name } : null;
}

function hashHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 42% 40%)`;
}

export type GalleryCardProps = {
  row: KernRow;
  fields: KernField[];
  coverFieldSlug: string | null;
  cardFieldSlugs: string[];
  collectionId: string;
  collection: KernCollection;
};

export function GalleryCard({
  row,
  fields,
  coverFieldSlug,
  cardFieldSlugs,
  collectionId,
  collection,
}: GalleryCardProps) {
  const openRow = useAppStore((s) => s.openRow);
  const coverRaw = coverFieldSlug ? row.data[coverFieldSlug] : null;
  const coverRef = useMemo(() => firstImageFileRef(coverRaw), [coverRaw]);
  const signedCoverUrl = useFileUrl(coverRef?.url ?? null);
  const primaryText = rowPrimaryLabel(row, fields);
  const slugs = cardFieldSlugs.slice(0, 3);

  const showImage = Boolean(coverFieldSlug && signedCoverUrl);
  const fallbackBg = collection.color ?? hashHue(collection.id);

  return (
    <button
      type="button"
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-kern-xl border border-kern-border bg-kern-bg text-left',
        'cursor-pointer transition-shadow hover:shadow-md'
      )}
      onClick={() => openRow(row.id, collectionId)}
    >
      <div className="relative h-36 w-full shrink-0">
        {showImage ? (
          <img src={signedCoverUrl!} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl"
            style={{ backgroundColor: fallbackBg }}
          >
            <span aria-hidden>{collection.icon ?? '📁'}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p
          className="text-sm font-medium text-kern-text"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {primaryText}
        </p>
        {slugs.map((slug) => {
          const field = fields.find((f) => f.slug === slug);
          const value = row.data[slug];
          if (!field || value === null || value === undefined || value === '') return null;
          const text = formatCellValueForCard(field, value);
          if (!text) return null;
          return (
            <div key={slug} className="mt-1 flex items-center gap-1">
              <FieldTypeIcon type={field.type} size={10} className="flex-shrink-0 text-kern-text-3" />
              <span className="truncate text-xs text-kern-text-2">{text}</span>
            </div>
          );
        })}
      </div>
    </button>
  );
}
