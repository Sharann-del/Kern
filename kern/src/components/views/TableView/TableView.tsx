import * as Checkbox from '@radix-ui/react-checkbox';
import {
  type ColumnSizingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpRight, Check, Plus, Table2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { toast } from 'sonner';

import { CellRenderer } from '@/components/cells/CellRenderer';
import type { CellSaveNav } from '@/components/cells/types';
import { BulkActionBar } from '@/components/row/BulkActionBar';
import { RowContextMenu } from '@/components/row/RowContextMenu';
import { TableColumnHeader } from '@/components/views/TableView/TableColumnHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDeleteField } from '@/hooks/useFields';
import { useCreateRow, useUpdateRow } from '@/hooks/useRows';
import { useUpdateView } from '@/hooks/useViews';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { KernCollection, KernField, KernRow, SortRule, ViewConfig } from '@/types/kern';

const columnHelper = createColumnHelper<KernRow>();

type TableMeta = {
  rows: KernRow[];
  editingCell: { rowId: string; fieldSlug: string } | null;
  setEditingCell: React.Dispatch<React.SetStateAction<{ rowId: string; fieldSlug: string } | null>>;
  selectedRowIds: Set<string>;
  setSelectedRowIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  collectionId: string;
  updateRow: ReturnType<typeof useUpdateRow>;
  navigateEdit: (dir: 'next' | 'prev') => void;
  setRowPending: (rowId: string, pending: boolean) => void;
};

export type TableViewProps = {
  rows: KernRow[];
  fields: KernField[];
  viewConfig: ViewConfig;
  viewId: string;
  collectionId: string;
  collection: KernCollection;
  onEditField: (field: KernField) => void;
  onAddField: () => void;
  onAddFieldBefore: (field: KernField) => void;
  onAddFieldAfter: (field: KernField) => void;
};

function TableViewInner({
  rows,
  fields,
  viewConfig,
  viewId,
  collectionId,
  collection,
  onEditField,
  onAddField,
  onAddFieldBefore,
  onAddFieldAfter,
}: TableViewProps) {
  void collection;
  const openRow = useAppStore((s) => s.openRow);
  const updateRow = useUpdateRow();
  const createRow = useCreateRow();
  const updateView = useUpdateView();
  const deleteField = useDeleteField();

  const [editingCell, setEditingCell] = useState<{ rowId: string; fieldSlug: string } | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [pendingRowIds, setPendingRowIds] = useState<Set<string>>(() => new Set());
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

  const editingCellRef = useRef(editingCell);
  editingCellRef.current = editingCell;

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const setRowPending = useCallback((rowId: string, pending: boolean) => {
    setPendingRowIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }, []);

  const hiddenFields = useMemo(() => viewConfig.hidden_fields ?? [], [viewConfig.hidden_fields]);
  const visibleFields = useMemo(
    () =>
      [...fields].filter((f) => !hiddenFields.includes(f.slug)).sort((a, b) => a.sort_order - b.sort_order),
    [fields, hiddenFields]
  );

  const defaultSizing = useMemo(() => {
    const o: ColumnSizingState = {};
    for (const f of visibleFields) {
      o[f.slug] = viewConfig.table_column_widths[f.slug] ?? 200;
    }
    return o;
  }, [visibleFields, viewConfig.table_column_widths]);

  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  useEffect(() => {
    setColumnSizing(defaultSizing);
  }, [defaultSizing]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const merged: Record<string, number> = { ...viewConfig.table_column_widths };
      let changed = false;
      for (const [k, v] of Object.entries(columnSizing)) {
        if (typeof v === 'number' && merged[k] !== v) {
          merged[k] = v;
          changed = true;
        }
      }
      if (changed) {
        updateView.mutate({
          id: viewId,
          collectionId,
          config: { table_column_widths: merged },
        });
      }
    }, 320);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [columnSizing, collectionId, updateView, viewConfig.table_column_widths, viewId]);

  const toggleSort = useCallback(
    (slug: string) => {
      const cur = viewConfig.sorts.find((s) => s.field_slug === slug);
      let next: SortRule[];
      if (!cur) {
        next = [{ id: crypto.randomUUID(), field_slug: slug, direction: 'asc' }];
      } else if (cur.direction === 'asc') {
        next = [{ ...cur, direction: 'desc' }];
      } else {
        next = [];
      }
      updateView.mutate({ id: viewId, collectionId, config: { sorts: next } });
    },
    [collectionId, updateView, viewConfig.sorts, viewId]
  );

  const hideField = useCallback(
    (slug: string) => {
      if (hiddenFields.includes(slug)) return;
      updateView.mutate({
        id: viewId,
        collectionId,
        config: { hidden_fields: [...hiddenFields, slug] },
      });
    },
    [collectionId, hiddenFields, updateView, viewId]
  );

  const navigateEdit = useCallback(
    (dir: 'next' | 'prev') => {
      const ec = editingCellRef.current;
      if (!ec) return;
      const slugs = visibleFields.map((f) => f.slug);
      const ri = rows.findIndex((r) => r.id === ec.rowId);
      const fi = slugs.indexOf(ec.fieldSlug);
      if (ri < 0 || fi < 0) return;
      let nr = ri;
      let nf = fi;
      if (dir === 'next') {
        if (nf + 1 < slugs.length) nf += 1;
        else if (ri + 1 < rows.length) {
          nr += 1;
          nf = 0;
        } else {
          setEditingCell(null);
          return;
        }
      } else {
        if (nf - 1 >= 0) nf -= 1;
        else if (ri - 1 >= 0) {
          nr -= 1;
          nf = slugs.length - 1;
        } else {
          setEditingCell(null);
          return;
        }
      }
      setEditingCell({ rowId: rows[nr].id, fieldSlug: slugs[nf] });
    },
    [rows, visibleFields]
  );

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const columns = useMemo(() => {
    const selectCol = columnHelper.display({
      id: 'select',
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableResizing: false,
      header: ({ table }) => {
        const m = table.options.meta as TableMeta;
        const all = m.rows.length > 0 && m.selectedRowIds.size === m.rows.length;
        const some = m.selectedRowIds.size > 0 && !all;
        return (
          <div
            className="flex h-full w-10 shrink-0 items-center justify-center border-r border-kern-border bg-kern-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox.Root
              checked={all ? true : some ? 'indeterminate' : false}
              onCheckedChange={(c) => {
                if (c === true) m.setSelectedRowIds(new Set(m.rows.map((r) => r.id)));
                else m.setSelectedRowIds(new Set());
              }}
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
              )}
            >
              <Checkbox.Indicator className="text-kern-on-accent">
                <Check size={12} strokeWidth={3} />
              </Checkbox.Indicator>
            </Checkbox.Root>
          </div>
        );
      },
      cell: ({ row, table }) => {
        const m = table.options.meta as TableMeta;
        return (
          <div
            className="flex h-full w-10 shrink-0 items-center justify-center border-r border-kern-surface-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox.Root
              checked={m.selectedRowIds.has(row.original.id)}
              onCheckedChange={(c) => {
                m.setSelectedRowIds((prev) => {
                  const next = new Set(prev);
                  if (c === true) next.add(row.original.id);
                  else next.delete(row.original.id);
                  return next;
                });
              }}
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
              )}
            >
              <Checkbox.Indicator className="text-kern-on-accent">
                <Check size={12} strokeWidth={3} />
              </Checkbox.Indicator>
            </Checkbox.Root>
          </div>
        );
      },
    });

    const fieldCols = visibleFields.map((field) => {
      const sortRule = viewConfig.sorts.find((s) => s.field_slug === field.slug);
      const isSorted = sortRule ? sortRule.direction : false;

      return columnHelper.accessor((row) => row.data[field.slug], {
        id: field.slug,
        size: viewConfig.table_column_widths[field.slug] ?? 200,
        minSize: 80,
        maxSize: 640,
        header: ({ header }) => (
          <TableColumnHeader
            field={field}
            isSorted={isSorted}
            onSort={() => toggleSort(field.slug)}
            width={header.getSize()}
            onResizeStart={header.getResizeHandler()}
            onEdit={() => onEditField(field)}
            onHide={() => hideField(field.slug)}
            onDelete={() => {
              if (!window.confirm(`Delete field “${field.name}”? This cannot be undone.`)) return;
              deleteField.mutate({ id: field.id, collectionId, slug: field.slug });
            }}
            onAddFieldBefore={() => onAddFieldBefore(field)}
            onAddFieldAfter={() => onAddFieldAfter(field)}
          />
        ),
        cell: ({ row, table }) => {
          const m = table.options.meta as TableMeta;
          const isEditing =
            m.editingCell?.rowId === row.original.id && m.editingCell?.fieldSlug === field.slug;
          const persistable =
            field.type === 'text' ||
            field.type === 'rich_text' ||
            field.type === 'file' ||
            field.type === 'email' ||
            field.type === 'url' ||
            field.type === 'phone' ||
            field.type === 'number';
          const rowId = row.original.id;
          const slug = field.slug;

          const commit = (v: unknown, nav?: CellSaveNav) => {
            if (nav?.row) {
              m.updateRow.mutate(
                { id: rowId, collectionId: m.collectionId, data: { [slug]: v } },
                {
                  onSuccess: () => {
                    const ri = m.rows.findIndex((r) => r.id === rowId);
                    if (nav.row === 'down') {
                      if (ri >= 0 && ri + 1 < m.rows.length) {
                        m.setEditingCell({ rowId: m.rows[ri + 1].id, fieldSlug: slug });
                      } else {
                        m.setEditingCell(null);
                      }
                    } else if (ri > 0) {
                      m.setEditingCell({ rowId: m.rows[ri - 1].id, fieldSlug: slug });
                    } else {
                      m.setEditingCell(null);
                    }
                  },
                }
              );
              return;
            }
            m.updateRow.mutate({ id: rowId, collectionId: m.collectionId, data: { [slug]: v } });
            m.setEditingCell(null);
          };

          return (
            <div className="h-full min-w-0 overflow-hidden border-r border-kern-surface-2" onClick={(e) => e.stopPropagation()}>
              <div className="h-9 min-h-[36px] w-full">
                <CellRenderer
                  value={row.original.data[field.slug]}
                  field={field}
                  row={row.original}
                  rowId={row.original.id}
                  isEditing={isEditing}
                  onStartEdit={() => m.setEditingCell({ rowId: row.original.id, fieldSlug: field.slug })}
                  onSave={(v, nav) => commit(v, nav)}
                  onCancel={() => m.setEditingCell(null)}
                  onEditNavigate={(dir) => {
                    m.navigateEdit(dir);
                  }}
                  persistWhileEditing={
                    persistable
                      ? (v) => {
                          m.updateRow.mutate({
                            id: rowId,
                            collectionId: m.collectionId,
                            data: { [slug]: v } as Record<string, unknown>,
                          });
                        }
                      : undefined
                  }
                  onPendingChange={persistable ? (p) => m.setRowPending(rowId, p) : undefined}
                />
              </div>
            </div>
          );
        },
      });
    });

    const addCol = columnHelper.display({
      id: '_add_field',
      size: 120,
      minSize: 120,
      maxSize: 120,
      enableResizing: false,
      header: () => (
        <div className="flex h-full w-[120px] shrink-0 items-center justify-center border-r border-kern-border bg-kern-bg px-2">
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onAddField}>
            <Plus size={12} />
            Add field
          </Button>
        </div>
      ),
      cell: () => <div className="h-full w-[120px] shrink-0 border-r border-kern-surface-2" />,
    });

    return [selectCol, ...fieldCols, addCol];
  }, [
    collectionId,
    deleteField,
    hideField,
    onAddField,
    onAddFieldAfter,
    onAddFieldBefore,
    onEditField,
    toggleSort,
    fields,
    viewConfig.hidden_fields.join(','),
    JSON.stringify(viewConfig.table_column_widths),
    JSON.stringify(viewConfig.sorts),
  ]);

  const tableMeta: TableMeta = useMemo(
    () => ({
      rows,
      editingCell,
      setEditingCell,
      selectedRowIds,
      setSelectedRowIds,
      collectionId,
      updateRow,
      navigateEdit,
      setRowPending,
    }),
    [rows, editingCell, selectedRowIds, collectionId, updateRow, navigateEdit, setRowPending]
  );

  // TanStack Table: intentional hook; React Compiler skips memoization for this library.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    defaultColumn: { minSize: 80, maxSize: 640, size: 200 },
    meta: tableMeta,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  useEffect(() => {
    if (rows.length === 0) {
      setFocusedRowIndex(null);
      return;
    }
    setFocusedRowIndex((i) => {
      if (i === null) return i;
      if (i >= rows.length) return rows.length - 1;
      return i;
    });
  }, [rows.length]);

  useEffect(() => {
    if (focusedRowIndex === null || focusedRowIndex < 0 || rows.length === 0) return;
    rowVirtualizer.scrollToIndex(focusedRowIndex, { align: 'auto' });
  }, [focusedRowIndex, rowVirtualizer, rows.length]);

  const handleAddRow = async () => {
    try {
      const created = await createRow.mutateAsync({ collectionId, data: {} });
      toast.success('Row added');
      openRow(created.id, collectionId);
    } catch {
      /* toastMutationError from hook */
    }
  };

  const hasFilters = viewConfig.filters.length > 0;
  if (rows.length === 0 && !hasFilters) {
    return (
      <EmptyState
        icon={Table2}
        title="No rows yet"
        subtitle="Add a row to get started."
        actionLabel="+ Add row"
        onAction={() => void handleAddRow()}
      />
    );
  }
  if (rows.length === 0 && hasFilters) {
    return (
      <EmptyState
        icon={Table2}
        title="No rows match filters"
        subtitle="Try adjusting or clearing filters in the toolbar."
      />
    );
  }

  const headerGroup = table.getHeaderGroups()[0];
  const totalSize = table.getTotalSize();

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingCellRef.current) return;
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex((i) => {
        if (rowsRef.current.length === 0) return null;
        return i === null ? 0 : Math.min(i + 1, rowsRef.current.length - 1);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex((i) => {
        if (rowsRef.current.length === 0) return null;
        return i === null ? 0 : Math.max(i - 1, 0);
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const list = rowsRef.current;
      if (list.length === 0) return;
      const idx = focusedRowIndex === null ? 0 : focusedRowIndex;
      const r = list[idx];
      if (r) openRow(r.id, collectionId);
      if (focusedRowIndex === null) setFocusedRowIndex(0);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div
        ref={parentRef}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto rounded-kern-lg border border-kern-border outline-none focus-visible:ring-2 focus-visible:ring-kern-accent/25"
        onKeyDown={handleTableKeyDown}
        onFocus={(ev) => {
          if (ev.target !== ev.currentTarget) return;
          if (rows.length && focusedRowIndex === null) setFocusedRowIndex(0);
        }}
      >
        <div
          className="sticky top-0 z-10 flex flex-col border-b border-kern-border bg-kern-bg"
          style={{ width: totalSize, minWidth: '100%' }}
        >
          {fields.length === 0 ? (
            <div className="flex shrink-0 items-center justify-center border-b border-kern-border px-3 py-2">
              <Button type="button" variant="ghost" size="sm" className="text-kern-accent" onClick={onAddField}>
                Add your first field →
              </Button>
            </div>
          ) : null}
          <div className="flex h-9 shrink-0">
            {headerGroup.headers.map((header) => (
              <div key={header.id} className="flex shrink-0" style={{ width: header.getSize() }}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        </div>

        <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), width: totalSize, minWidth: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            if (virtualRow.index === rows.length) {
              return (
                <div
                  key="add-row"
                  className="absolute left-0 top-0 flex h-9 w-full cursor-pointer items-center border-b border-kern-surface-2 text-sm text-kern-text-3 hover:bg-kern-surface"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    width: totalSize,
                  }}
                  onClick={() => void handleAddRow()}
                >
                  <div className="w-10 shrink-0" />
                  <span className="px-6">+ Add row</span>
                </div>
              );
            }

            const row = table.getRowModel().rows[virtualRow.index];
            if (!row) return null;

            const isFocused = focusedRowIndex === virtualRow.index;

            return (
              <RowContextMenu key={row.id} row={row.original} collectionId={collectionId}>
                <div
                  role="row"
                  className={cn(
                    'group absolute left-0 top-0 flex h-9 w-full border-b border-kern-surface-2 hover:bg-kern-surface',
                    isFocused && 'bg-kern-accent/5'
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    width: totalSize,
                  }}
                  onClick={() => {
                    setFocusedRowIndex(virtualRow.index);
                    openRow(row.original.id, collectionId);
                  }}
                >
                  {pendingRowIds.has(row.original.id) ? (
                    <span
                      className="pointer-events-none absolute left-1 top-1/2 z-[2] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-kern-text-3"
                      aria-hidden
                    />
                  ) : null}
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex shrink-0 overflow-hidden"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 z-[1] hidden -translate-y-1/2 rounded-kern-sm p-1 text-kern-text-3 hover:bg-kern-surface-2 hover:text-kern-text group-hover:inline-flex"
                    aria-label="Open row"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRow(row.original.id, collectionId);
                    }}
                  >
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </RowContextMenu>
            );
          })}
        </div>
      </div>

      <BulkActionBar
        collectionId={collectionId}
        selectedRowIds={selectedRowIds}
        rowsById={rowsById}
        onClearSelection={() => setSelectedRowIds(new Set())}
      />
    </div>
  );
}

export const TableView = memo(TableViewInner);
