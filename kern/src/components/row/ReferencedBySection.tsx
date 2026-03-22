import * as Collapsible from '@radix-ui/react-collapsible';
import { useQueries } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RelationPill } from '@/components/row/RelationPill';
import { useCollections } from '@/hooks/useCollections';
import { fetchFieldsForCollection } from '@/hooks/useFields';
import { useReversedRelations } from '@/hooks/useRelations';
import { cn } from '@/lib/utils';

export type ReferencedBySectionProps = {
  rowId: string;
};

export function ReferencedBySection({ rowId }: ReferencedBySectionProps) {
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useReversedRelations(rowId);
  const { data: collections = [] } = useCollections();

  const collectionIds = useMemo(
    () => [...new Set(items.map((i) => i.sourceRow.collection_id))],
    [items]
  );

  const fieldQueries = useQueries({
    queries: collectionIds.map((cid) => ({
      queryKey: ['fields', cid],
      queryFn: () => fetchFieldsForCollection(cid),
      enabled: Boolean(rowId) && collectionIds.length > 0,
      staleTime: 120_000,
    })),
  });

  const fieldsByCollectionId = useMemo(() => {
    const m = new Map<string, Awaited<ReturnType<typeof fetchFieldsForCollection>>>();
    collectionIds.forEach((id, i) => {
      m.set(id, fieldQueries[i]?.data ?? []);
    });
    return m;
  }, [collectionIds, fieldQueries]);

  const collectionMap = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const it of items) {
      const cid = it.sourceRow.collection_id;
      const list = m.get(cid) ?? [];
      list.push(it);
      m.set(cid, list);
    }
    return m;
  }, [items]);

  if (isLoading && items.length === 0) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="mb-2">
      <Collapsible.Trigger className="flex w-full items-center gap-1 py-2 text-left text-sm text-kern-text-2 hover:text-kern-text">
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
        <span>
          Referenced by ({items.length})
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden">
        <div className="space-y-4 pb-4 pt-1">
          {[...grouped.entries()].map(([cid, list]) => {
            const col = collectionMap.get(cid);
            const fields = fieldsByCollectionId.get(cid) ?? [];
            return (
              <div key={cid}>
                <div className="mb-2 flex items-center gap-2 text-xs text-kern-text-3">
                  {col?.icon ? <span>{col.icon}</span> : null}
                  {!col?.icon && col?.color ? (
                    <span
                      className="h-3 w-3 rounded-kern-sm border border-kern-border"
                      style={{ backgroundColor: col.color }}
                    />
                  ) : null}
                  <span className="font-medium uppercase tracking-wider">{col?.name ?? 'Collection'}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {list.map((it) => (
                    <RelationPill
                      key={it.relation.id}
                      row={it.sourceRow}
                      fields={fields}
                      collectionId={cid}
                      collection={col ? { icon: col.icon, color: col.color, name: col.name } : null}
                      clickable
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
