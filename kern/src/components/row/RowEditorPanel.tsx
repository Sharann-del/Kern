import * as Checkbox from '@radix-ui/react-checkbox';
import { useQueries } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

import { ReferencedBySection } from '@/components/row/ReferencedBySection';
import { RelationPicker } from '@/components/row/RelationPicker';
import { RowDatePickerButton } from '@/components/row/RowDatePickerButton';
import { RowEditorRichText } from '@/components/row/RowEditorRichText';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { fetchCollectionById, useCollectionById } from '@/hooks/useCollections';
import { fetchFieldsForCollection, useFields } from '@/hooks/useFields';
import {
  type RelationEntry,
  useAddRelation,
  useRelations,
  useRemoveRelation,
} from '@/hooks/useRelations';
import { useCreateRow, useDeleteRow, useRow, useUpdateRow } from '@/hooks/useRows';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type {
  KernCollection,
  KernField,
  KernRow,
  NumberFieldOptions,
  RelationFieldOptions,
  SelectFieldOptions,
  SelectOption,
} from '@/types/kern';

function parseDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function pillStyle(color: string) {
  return { backgroundColor: `${color}26`, color } as const;
}

type RowEditorPanelInnerProps = {
  rowId: string;
  collectionId: string;
  onClose: () => void;
  entered: boolean;
};

function RowEditorPanelInner({ rowId, collectionId, onClose, entered }: RowEditorPanelInnerProps) {
  const { data: row, isLoading: rowLoading } = useRow(rowId);
  const { data: fields = [], isLoading: fieldsLoading } = useFields(collectionId);
  const { data: collection, isLoading: colLoading } = useCollectionById(collectionId);
  const { data: relationsData } = useRelations(rowId, fields);
  const relationsMap = relationsData ?? {};
  const updateRow = useUpdateRow();
  const deleteRow = useDeleteRow();
  const createRow = useCreateRow();
  const addRelation = useAddRelation();
  const removeRelation = useRemoveRelation();

  const [banner, setBanner] = useState<string | null>(null);
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latestQueuedBySlug = useRef<Record<string, unknown>>({});
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const relationTargetIds = useMemo(() => {
    const s = new Set<string>();
    for (const f of fields) {
      if (f.type === 'relation' && f.options && 'target_collection_id' in f.options) {
        s.add((f.options as RelationFieldOptions).target_collection_id);
      }
    }
    return [...s];
  }, [fields]);

  const tgtFieldsQueries = useQueries({
    queries: relationTargetIds.map((tid) => ({
      queryKey: ['fields', tid],
      queryFn: () => fetchFieldsForCollection(tid),
      staleTime: 120_000,
    })),
  });

  const tgtColQueries = useQueries({
    queries: relationTargetIds.map((tid) => ({
      queryKey: ['collectionById', tid],
      queryFn: () => fetchCollectionById(tid),
      staleTime: 60_000,
    })),
  });

  const tgtFieldsMap = useMemo(
    () => new Map(relationTargetIds.map((id, i) => [id, tgtFieldsQueries[i]?.data ?? []])),
    [relationTargetIds, tgtFieldsQueries]
  );

  const tgtColMap = useMemo(
    () => new Map(relationTargetIds.map((id, i) => [id, tgtColQueries[i]?.data ?? null])),
    [relationTargetIds, tgtColQueries]
  );

  const mutateBanner = useCallback(
    (slug: string, v: unknown) => {
      if (!row) return;
      setBanner('Saving...');
      updateRow.mutate(
        { id: row.id, collectionId, data: { [slug]: v } },
        {
          onSettled: () => {
            setBanner('Saved ✓');
            setTimeout(() => setBanner(null), 1500);
          },
        }
      );
    },
    [row, collectionId, updateRow]
  );

  const queueSave = useCallback(
    (slug: string, v: unknown) => {
      latestQueuedBySlug.current[slug] = v;
      if (debouncers.current[slug]) clearTimeout(debouncers.current[slug]);
      debouncers.current[slug] = setTimeout(() => {
        const val = latestQueuedBySlug.current[slug];
        mutateBanner(slug, val);
        delete debouncers.current[slug];
        delete latestQueuedBySlug.current[slug];
      }, 500);
    },
    [mutateBanner]
  );

  const flushPendingSaves = useCallback(() => {
    for (const slug of Object.keys(debouncers.current)) {
      clearTimeout(debouncers.current[slug]);
      delete debouncers.current[slug];
    }
    const pending = { ...latestQueuedBySlug.current };
    latestQueuedBySlug.current = {};
    for (const [slug, v] of Object.entries(pending)) {
      mutateBanner(slug, v);
    }
  }, [mutateBanner]);

  const handleEditorScrollKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || e.defaultPrevented) return;
    const root = editorScrollRef.current;
    if (!root || !root.contains(e.target as Node)) return;
    const sel =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-row-editor-field]'));
    const list: HTMLElement[] = [];
    for (const block of blocks) {
      for (const el of block.querySelectorAll<HTMLElement>(sel)) {
        if (el.offsetParent !== null || document.activeElement === el) list.push(el);
      }
    }
    if (list.length < 2) return;
    const ae = document.activeElement as HTMLElement | null;
    const i = ae ? list.indexOf(ae) : -1;
    if (i < 0) return;
    e.preventDefault();
    const next = e.shiftKey ? (i - 1 + list.length) % list.length : (i + 1) % list.length;
    list[next]?.focus();
  }, []);

  useEffect(
    () => () => {
      Object.values(debouncers.current).forEach((t) => clearTimeout(t));
    },
    []
  );

  const handleDelete = () => {
    if (!row || !window.confirm('Delete this row? This cannot be undone.')) return;
    const snapshot = { ...row.data };
    deleteRow.mutate(
      { id: row.id, collectionId },
      {
        onSuccess: () => {
          toast.success('Row deleted', {
            duration: 5000,
            action: {
              label: 'Undo',
              onClick: () => {
                createRow.mutate({ collectionId, data: snapshot });
              },
            },
          });
          onClose();
        },
      }
    );
  };

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const loading = rowLoading || fieldsLoading || colLoading;

  if (!loading && row === null) {
    onClose();
    return null;
  }

  const iconBlock = collection?.icon ? (
    <span className="text-lg leading-none">{collection.icon}</span>
  ) : collection?.color ? (
    <span
      className="h-6 w-6 shrink-0 rounded-kern-md border border-kern-border"
      style={{ backgroundColor: collection.color }}
      aria-hidden
    />
  ) : (
    <span className="h-6 w-6 shrink-0 rounded-kern-md border border-kern-border bg-kern-surface" />
  );

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[30] bg-black/20 transition-opacity duration-200"
        style={{ opacity: entered ? 1 : 0 }}
        aria-label="Close row editor"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed bottom-0 right-0 z-[35] flex w-[480px] max-w-full flex-col border-l border-kern-border bg-kern-bg shadow-ds-md transition-transform duration-200 ease-out',
          entered ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ top: 48 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDownCapture={(e) => {
          if (!row) return;
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            flushPendingSaves();
            onClose();
          }
        }}
      >
        {loading || !row ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <Skeleton className="mb-4 h-8 w-48 rounded-kern-md" />
            <SkeletonText className="mb-6 max-w-xs" />
            <Skeleton className="mb-3 h-24 w-full rounded-kern-md" />
            <Skeleton className="mb-3 h-24 w-full rounded-kern-md" />
            <Skeleton className="h-24 w-full rounded-kern-md" />
          </div>
        ) : (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kern-border px-4">
              {iconBlock}
              <span className="truncate text-sm text-kern-text-2">{collection?.name ?? 'Collection'}</span>
              <span className="ml-auto truncate font-mono text-xs text-kern-text-3" title={row.id}>
                {row.id.slice(0, 8)}…
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={onClose}>
                <X size={16} />
              </Button>
            </header>
            <div className="shrink-0 border-b border-kern-border px-4 py-2 text-xs text-kern-text-3">
              <span>Created {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</span>
              <span className="mx-1">·</span>
              <span>Updated {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}</span>
              {banner ? (
                <>
                  <span className="mx-2">·</span>
                  <span className={cn(banner.includes('Saved') && 'text-kern-accent')}>{banner}</span>
                </>
              ) : null}
            </div>
            <div
              ref={editorScrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
              onKeyDown={handleEditorScrollKeyDown}
            >
              <ErrorBoundary>
                {sortedFields.map((field) => (
                  <div key={field.id} className="mb-5" data-row-editor-field>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <FieldTypeIcon type={field.type} size={12} className="text-kern-text-2" />
                      <span className="text-xs font-medium text-kern-text-2">{field.name}</span>
                      {field.is_required ? <span className="text-kern-danger">*</span> : null}
                    </div>
                    <RowFieldEditor
                      key={field.id}
                      field={field}
                      row={row}
                      relationsMap={relationsMap}
                      tgtFieldsMap={tgtFieldsMap}
                      tgtColMap={tgtColMap}
                      queueSave={queueSave}
                      mutateBanner={mutateBanner}
                      onAddRelation={(fieldId, targetRowId) =>
                        addRelation.mutate({ sourceRowId: row.id, targetRowId, fieldId })
                      }
                      onRemoveRelation={(relationId) =>
                        removeRelation.mutate({ id: relationId, sourceRowId: row.id })
                      }
                    />
                  </div>
                ))}
                <ReferencedBySection rowId={row.id} />
              </ErrorBoundary>
            </div>
            <footer className="flex h-12 shrink-0 items-center border-t border-kern-border px-4">
              <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={deleteRow.isPending}>
                Delete row
              </Button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function RowFieldEditor({
  field,
  row,
  relationsMap,
  tgtFieldsMap,
  tgtColMap,
  queueSave,
  mutateBanner,
  onAddRelation,
  onRemoveRelation,
}: {
  field: KernField;
  row: KernRow;
  relationsMap: Record<string, RelationEntry[]>;
  tgtFieldsMap: Map<string, KernField[]>;
  tgtColMap: Map<string, KernCollection | null>;
  queueSave: (slug: string, v: unknown) => void;
  mutateBanner: (slug: string, v: unknown) => void;
  onAddRelation: (fieldId: string, targetRowId: string) => void;
  onRemoveRelation: (relationId: string) => void;
}) {
  const slug = field.slug;
  const value = row.data[slug];

  const inputClass =
    'w-full rounded-kern-md border border-kern-border bg-kern-bg px-3 py-2 text-sm text-kern-text outline-none focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30';

  switch (field.type) {
    case 'text':
      return (
        <input
          className={inputClass}
          defaultValue={String(value ?? '')}
          onChange={(e) => queueSave(slug, e.target.value)}
          onBlur={(e) => mutateBanner(slug, e.target.value)}
        />
      );
    case 'rich_text':
      return (
        <RowEditorRichText
          value={typeof value === 'string' ? value : ''}
          onDebouncedChange={(html) => queueSave(slug, html)}
          onFlush={(html) => mutateBanner(slug, html)}
        />
      );
    case 'number': {
      const o = (field.options as NumberFieldOptions | null) ?? {};
      const unit = o.unit ?? '';
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className={cn(inputClass, 'flex-1')}
            defaultValue={
              typeof value === 'number' && Number.isFinite(value)
                ? String(value)
                : typeof value === 'string' && value !== ''
                  ? value
                  : ''
            }
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              queueSave(slug, e.target.value === '' ? null : Number.isFinite(n) ? n : null);
            }}
            onBlur={(e) => {
              const n = parseFloat(e.target.value);
              mutateBanner(slug, e.target.value === '' ? null : Number.isFinite(n) ? n : null);
            }}
          />
          {unit ? <span className="text-sm text-kern-text-2">{unit}</span> : null}
        </div>
      );
    }
    case 'date':
      return <RowDatePickerButton value={value} onChange={(iso) => mutateBanner(slug, iso)} />;
    case 'datetime': {
      const d = parseDate(value);
      const datePart = d ? format(d, 'yyyy-MM-dd') : '';
      const timePart = d ? format(d, 'HH:mm') : '';
      return (
        <div className="flex gap-2">
          <input
            type="date"
            className={inputClass}
            defaultValue={datePart}
            onChange={(e) => {
              const t = timePart || '00:00';
              const next = new Date(`${e.target.value}T${t}`);
              queueSave(slug, Number.isNaN(next.getTime()) ? null : next.toISOString());
            }}
            onBlur={(e) => {
              const t = timePart || '00:00';
              const next = new Date(`${e.target.value}T${t}`);
              mutateBanner(slug, Number.isNaN(next.getTime()) ? null : next.toISOString());
            }}
          />
          <input
            type="time"
            className={cn(inputClass, 'w-36')}
            defaultValue={timePart}
            onChange={(e) => {
              const dp = datePart || format(new Date(), 'yyyy-MM-dd');
              const next = new Date(`${dp}T${e.target.value}`);
              queueSave(slug, Number.isNaN(next.getTime()) ? null : next.toISOString());
            }}
            onBlur={(e) => {
              const dp = datePart || format(new Date(), 'yyyy-MM-dd');
              const next = new Date(`${dp}T${e.target.value}`);
              mutateBanner(slug, Number.isNaN(next.getTime()) ? null : next.toISOString());
            }}
          />
        </div>
      );
    }
    case 'boolean': {
      const checked = value === true || value === 'true';
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox.Root
            checked={checked}
            onCheckedChange={(c) => mutateBanner(slug, c === true)}
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
              'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
            )}
          >
            <Checkbox.Indicator className="text-kern-on-accent">
              <Check size={14} strokeWidth={3} />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <span className="text-sm text-kern-text">{checked ? 'True' : 'False'}</span>
        </label>
      );
    }
    case 'select': {
      const items = ((field.options as SelectFieldOptions | null)?.items ?? []) as SelectOption[];
      const id = typeof value === 'string' ? value : '';
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((opt) => {
            const active = opt.id === id;
            return (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active ? 'ring-2 ring-kern-accent ring-offset-1 ring-offset-kern-bg' : 'border border-kern-border'
                )}
                style={active ? pillStyle(opt.color) : { color: opt.color, borderColor: `${opt.color}66` }}
                onClick={() => mutateBanner(slug, opt.id)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'multi_select': {
      const items = ((field.options as SelectFieldOptions | null)?.items ?? []) as SelectOption[];
      const ids = new Set(Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []);
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((opt) => {
            const active = ids.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active ? 'ring-2 ring-kern-accent ring-offset-1 ring-offset-kern-bg' : 'border border-kern-border'
                )}
                style={active ? pillStyle(opt.color) : { color: opt.color, borderColor: `${opt.color}66` }}
                onClick={() => {
                  const next = new Set(ids);
                  if (active) next.delete(opt.id);
                  else next.add(opt.id);
                  mutateBanner(slug, [...next]);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'url': {
      const raw = typeof value === 'string' ? value : '';
      const href = raw && /^https?:\/\//i.test(raw) ? raw : raw ? `https://${raw}` : '';
      return (
        <div className="flex gap-2">
          <input
            type="url"
            className={cn(inputClass, 'flex-1')}
            defaultValue={raw}
            onChange={(e) => queueSave(slug, e.target.value)}
            onBlur={(e) => mutateBanner(slug, e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!href}
            onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
          >
            Open ↗
          </Button>
        </div>
      );
    }
    case 'email': {
      const raw = typeof value === 'string' ? value : '';
      return (
        <div className="flex gap-2">
          <input
            type="email"
            className={cn(inputClass, 'flex-1')}
            defaultValue={raw}
            onChange={(e) => queueSave(slug, e.target.value)}
            onBlur={(e) => mutateBanner(slug, e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!raw.trim()}
            onClick={() => window.open(`mailto:${encodeURIComponent(raw.trim())}`)}
          >
            Send mail
          </Button>
        </div>
      );
    }
    case 'phone': {
      const raw = typeof value === 'string' ? value : '';
      const tel = raw.replace(/[^\d+]/g, '');
      return (
        <div className="flex gap-2">
          <input
            type="tel"
            className={cn(inputClass, 'flex-1')}
            defaultValue={raw}
            onChange={(e) => queueSave(slug, e.target.value)}
            onBlur={(e) => mutateBanner(slug, e.target.value)}
          />
          <Button type="button" size="sm" variant="ghost" disabled={!tel} onClick={() => window.open(`tel:${tel}`)}>
            Call
          </Button>
        </div>
      );
    }
    case 'relation': {
      const opts = field.options as RelationFieldOptions | null;
      const tid = opts?.target_collection_id ?? '';
      const entries = relationsMap[field.id] ?? [];
      const tf = tgtFieldsMap.get(tid) ?? [];
      const col = tgtColMap.get(tid);
      const meta = col
        ? { icon: col.icon, color: col.color, name: col.name }
        : { icon: null as string | null, color: null as string | null, name: 'Collection' };
      return (
        <RelationPicker
          field={field}
          currentRelations={entries}
          targetFields={tf}
          targetCollectionMeta={meta}
          onAdd={(targetRowId) => onAddRelation(field.id, targetRowId)}
          onRemove={onRemoveRelation}
        />
      );
    }
    case 'file':
      return (
        <div className="rounded-kern-md border border-dashed border-kern-border px-3 py-6 text-center text-sm text-kern-text-3">
          File upload coming soon
        </div>
      );
    default:
      return (
        <input
          className={inputClass}
          defaultValue={String(value ?? '')}
          onChange={(e) => queueSave(slug, e.target.value)}
          onBlur={(e) => mutateBanner(slug, e.target.value)}
        />
      );
  }
}

export function RowEditorPanel() {
  const openRowId = useAppStore((s) => s.openRowId);
  const openRowCollectionId = useAppStore((s) => s.openRowCollectionId);
  const closeRow = useAppStore((s) => s.closeRow);
  const visible = Boolean(openRowId && openRowCollectionId);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(() => setEntered(false));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, closeRow]);

  if (!openRowId || !openRowCollectionId) {
    return null;
  }

  return (
    <RowEditorPanelInner
      key={openRowId}
      rowId={openRowId}
      collectionId={openRowCollectionId}
      onClose={closeRow}
      entered={entered}
    />
  );
}
