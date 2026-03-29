import * as Select from '@radix-ui/react-select';
import { Filter, ChevronDown, X } from 'lucide-react';
import { useCallback, useLayoutEffect } from 'react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { OPERATORS_BY_FIELD_TYPE } from '@/lib/field-operators';
import { cn } from '@/lib/utils';
import type { FilterRule, KernField, SelectFieldOptions, ViewConfig } from '@/types/kern';

export type ViewFilterBarProps = {
  fields: KernField[];
  viewConfig: ViewConfig;
  onUpdateConfig: (partial: Partial<ViewConfig>) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function FilterValueInput({
  rule,
  field,
  onPatch,
}: {
  rule: FilterRule;
  field: KernField | undefined;
  onPatch: (patch: Partial<FilterRule>) => void;
}) {
  if (!field) return null;
  const op = rule.operator;

  if (
    op === 'is_empty' ||
    op === 'is_not_empty' ||
    op === 'is_true' ||
    op === 'is_false'
  ) {
    return null;
  }
  if (field.type === 'boolean') {
    return null;
  }

  const items = ((field.options as SelectFieldOptions | null)?.items ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  if (
    field.type === 'select' ||
    (field.type === 'multi_select' && (op === 'contains' || op === 'not_contains'))
  ) {
    const v = String(rule.value ?? '');
    return (
      <Select.Root value={v || undefined} onValueChange={(nv) => onPatch({ value: nv })}>
        <Select.Trigger
          className={cn(
            'flex h-8 min-w-[100px] max-w-[140px] flex-1 items-center justify-between gap-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs',
            'outline-none focus:ring-0'
          )}
        >
          <Select.Value placeholder="Value" />
          <ChevronDown size={12} className="shrink-0 text-kern-text-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-[50] max-h-48 overflow-y-auto rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {items.map((it) => (
                <Select.Item
                  key={it.id}
                  value={it.id}
                  className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-kern-surface-2"
                >
                  <Select.ItemText>{it.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    );
  }

  if (field.type === 'date' || field.type === 'datetime') {
    const raw = typeof rule.value === 'string' ? rule.value : '';
    const d = raw.slice(0, 10);
    return (
      <input
        type="date"
        className="h-8 min-w-[110px] flex-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs text-kern-text outline-none focus:ring-0"
        value={d}
        onChange={(e) => onPatch({ value: e.target.value })}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className="h-8 min-w-[80px] flex-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs text-kern-text outline-none focus:ring-0"
        value={
          rule.value === '' || rule.value === undefined || rule.value === null ? '' : String(rule.value)
        }
        onChange={(e) => {
          const x = e.target.value;
          onPatch({ value: x === '' ? '' : Number(x) });
        }}
      />
    );
  }

  return (
    <input
      type="text"
      className="h-8 min-w-[80px] flex-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs text-kern-text outline-none focus:ring-0"
      value={String(rule.value ?? '')}
      onChange={(e) => onPatch({ value: e.target.value })}
    />
  );
}

function FilterRuleRow({
  rule,
  fields,
  filters,
  updateFilters,
}: {
  rule: FilterRule;
  fields: KernField[];
  filters: FilterRule[];
  updateFilters: (next: FilterRule[]) => void;
}) {
  const field = fields.find((f) => f.slug === rule.field_slug) ?? fields[0];
  const ops = field ? OPERATORS_BY_FIELD_TYPE[field.type] : [];
  const operatorForUi =
    ops.some((o) => o.operator === rule.operator) ? rule.operator : (ops[0]?.operator ?? rule.operator);

  const patchRule = (patch: Partial<FilterRule>) =>
    updateFilters(filters.map((r) => (r.id === rule.id ? { ...r, ...patch } : r)));

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Select.Root
        value={rule.field_slug}
        onValueChange={(slug) => {
          const f = fields.find((x) => x.slug === slug);
          const firstOp = f ? OPERATORS_BY_FIELD_TYPE[f.type][0]?.operator ?? 'contains' : 'contains';
          patchRule({ field_slug: slug, operator: firstOp, value: '' });
        }}
      >
        <Select.Trigger
          className={cn(
            'flex h-8 min-w-[100px] max-w-[120px] items-center justify-between gap-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs',
            'outline-none focus:ring-0'
          )}
        >
          <span className="flex min-w-0 items-center gap-1 truncate">
            {field ? <FieldTypeIcon type={field.type} size={12} /> : null}
            <Select.Value placeholder="Field" />
          </span>
          <ChevronDown size={12} className="shrink-0 text-kern-text-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-[45] max-h-48 overflow-y-auto rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {fields.map((f) => (
                <Select.Item
                  key={f.id}
                  value={f.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-kern-surface-2"
                >
                  <FieldTypeIcon type={f.type} size={12} />
                  <Select.ItemText>{f.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <Select.Root
        value={operatorForUi}
        onValueChange={(op) => patchRule({ operator: op as FilterRule['operator'] })}
      >
        <Select.Trigger
          className={cn(
            'flex h-8 min-w-[88px] items-center justify-between gap-1 rounded-kern-md border border-kern-border bg-kern-bg px-2 text-xs',
            'outline-none focus:ring-0'
          )}
        >
          <Select.Value />
          <ChevronDown size={12} className="shrink-0 text-kern-text-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-[45] rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport>
              {ops.map((op) => (
                <Select.Item
                  key={op.operator}
                  value={op.operator}
                  className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-kern-surface-2"
                >
                  <Select.ItemText>{op.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <FilterValueInput rule={rule} field={field} onPatch={patchRule} />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        aria-label="Remove filter"
        onClick={() => updateFilters(filters.filter((r) => r.id !== rule.id))}
      >
        <X size={14} />
      </Button>
    </div>
  );
}

export function ViewFilterBar({
  fields,
  viewConfig,
  onUpdateConfig,
  open,
  onOpenChange,
}: ViewFilterBarProps) {
  const filters = viewConfig.filters;
  const hasFilters = filters.length > 0;

  const updateFilters = useCallback(
    (next: FilterRule[]) => onUpdateConfig({ filters: next }),
    [onUpdateConfig]
  );

  useLayoutEffect(() => {
    if (!fields.length || !filters.length) return;
    let changed = false;
    const next = filters.map((r) => {
      const f = fields.find((x) => x.slug === r.field_slug);
      if (!f) return r;
      const opList = OPERATORS_BY_FIELD_TYPE[f.type];
      if (!opList.length) return r;
      if (opList.some((o) => o.operator === r.operator)) return r;
      changed = true;
      return { ...r, operator: opList[0].operator };
    });
    if (changed) onUpdateConfig({ filters: next });
  }, [fields, filters, onUpdateConfig]);

  const content = (
    <div className="w-[320px] p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-kern-text">Filters</span>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onUpdateConfig({ filters: [] })}
          >
            Clear all
          </Button>
        ) : null}
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filters.map((rule) => (
          <FilterRuleRow
            key={rule.id}
            rule={rule}
            fields={fields}
            filters={filters}
            updateFilters={updateFilters}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2 w-full"
        disabled={!fields.length}
        onClick={() => {
          const f0 = fields[0];
          const firstOp = f0 ? (OPERATORS_BY_FIELD_TYPE[f0.type][0]?.operator ?? 'contains') : 'contains';
          updateFilters([
            ...filters,
            {
              id: crypto.randomUUID(),
              field_slug: f0?.slug ?? 'name',
              operator: firstOp,
              value: '',
            },
          ]);
        }}
      >
        + Add filter
      </Button>
    </div>
  );

  return (
    <Popover
      align="end"
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <button
          type="button"
          className={cn(
            'relative flex h-9 items-center gap-2 rounded-none px-3 text-sm transition-colors',
            hasFilters
              ? 'bg-kern-accent/15 text-kern-accent hover:bg-kern-accent/22'
              : 'bg-kern-surface-2 text-kern-text-2 hover:bg-kern-surface hover:text-kern-text'
          )}
        >
          <Filter size={14} />
          <span>Filter</span>
          {hasFilters ? (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-none bg-kern-accent px-1 text-[10px] font-medium text-kern-on-accent">
              {filters.length}
            </span>
          ) : null}
        </button>
      }
    >
      {content}
    </Popover>
  );
}
