import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RelationPill } from '@/components/row/RelationPill';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRows } from '@/hooks/useRows';
import type { RelationEntry } from '@/hooks/useRelations';
import { rowPrimaryLabel } from '@/lib/rowDisplay';
import type { KernField, RelationFieldOptions } from '@/types/kern';
import { cn } from '@/lib/utils';

export type RelationPickerProps = {
  field: KernField;
  currentRelations: RelationEntry[];
  targetFields: KernField[];
  targetCollectionMeta: { icon: string | null; color: string | null; name: string } | null;
  onAdd: (targetRowId: string) => void;
  onRemove: (relationId: string) => void;
};

export function RelationPicker({
  field,
  currentRelations,
  targetFields,
  targetCollectionMeta,
  onAdd,
  onRemove,
}: RelationPickerProps) {
  const opts = field.options as RelationFieldOptions | null;
  const targetCollectionId = opts?.target_collection_id ?? '';
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const { data: rows = [] } = useRows(targetCollectionId);

  const linkedByTargetId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of currentRelations) {
      m.set(e.row.id, e.relationId);
    }
    return m;
  }, [currentRelations]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => rowPrimaryLabel(r, targetFields).toLowerCase().includes(s));
  }, [rows, q, targetFields]);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {currentRelations.map((e) => (
        <RelationPill
          key={e.relationId}
          row={e.row}
          fields={targetFields}
          collectionId={targetCollectionId}
          collection={targetCollectionMeta ?? undefined}
          onRemove={() => onRemove(e.relationId)}
          clickable
        />
      ))}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ('');
        }}
        align="start"
        trigger={
          <Button type="button" variant="secondary" size="sm" className="h-7 gap-1 text-xs">
            <Plus size={12} />
            Link
          </Button>
        }
      >
        <div className="w-[280px] p-2">
          <div className="relative mb-2">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-kern-text-3"
            />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search rows…"
              className="h-8 pl-8 text-sm"
              autoComplete="off"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-kern-md border border-kern-border">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-kern-text-3">
                {rows.length === 0
                  ? `No rows in ${targetCollectionMeta?.name ?? 'this collection'} yet`
                  : 'No matching rows'}
              </p>
            ) : (
              filtered.map((r) => {
                const relId = linkedByTargetId.get(r.id);
                const linked = Boolean(relId);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 border-b border-kern-border px-3 py-2 text-left text-sm last:border-0 hover:bg-kern-surface-2',
                      linked && 'bg-kern-accent/5'
                    )}
                    onClick={() => {
                      if (linked && relId) onRemove(relId);
                      else onAdd(r.id);
                    }}
                  >
                    <span className="min-w-0 truncate">{rowPrimaryLabel(r, targetFields)}</span>
                    {linked ? <Check size={14} className="shrink-0 text-kern-accent" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}
