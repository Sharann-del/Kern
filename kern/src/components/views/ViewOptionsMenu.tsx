import * as Checkbox from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useMemo } from 'react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { KernField, KernView, ViewConfig } from '@/types/kern';

export type ViewOptionsMenuProps = {
  activeView: KernView | null;
  fields: KernField[];
  onUpdateViewConfig: (partial: Partial<ViewConfig>) => void;
};

export function ViewOptionsMenu({ activeView, fields, onUpdateViewConfig }: ViewOptionsMenuProps) {
  const selectFields = useMemo(() => fields.filter((f) => f.type === 'select'), [fields]);
  const orderedFields = useMemo(
    () => [...fields].sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const cardSlugs = activeView?.config.gallery_card_fields ?? [];
  const groupBySlug = activeView?.config.group_by_field;
  const groupByValid =
    Boolean(groupBySlug) && selectFields.some((f) => f.slug === groupBySlug);

  const toggleCardField = (slug: string) => {
    const set = new Set(cardSlugs);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    onUpdateViewConfig({ gallery_card_fields: [...set] });
  };

  const isKanban = activeView?.type === 'kanban';

  const content = !activeView ? null : !isKanban ? (
    <div className="w-[240px] p-2">
      <p className="text-xs text-kern-text-3">No extra options for this view.</p>
    </div>
  ) : (
    <div className="w-[280px] p-2">
      <p className="mb-2 text-xs font-medium text-kern-text-2">Kanban</p>

      <p className="mb-1 text-xs text-kern-text-3">Group by field</p>
      <Select.Root
        value={groupByValid ? groupBySlug! : undefined}
        onValueChange={(slug) => onUpdateViewConfig({ group_by_field: slug })}
      >
        <Select.Trigger
          className={cn(
            'mb-4 flex h-9 w-full items-center justify-between gap-2 rounded-kern-md border border-kern-border bg-kern-surface px-2.5 text-sm',
            'outline-none focus:ring-2 focus:ring-kern-accent/30'
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
            {groupByValid ? (
              <FieldTypeIcon
                type={selectFields.find((f) => f.slug === groupBySlug)!.type}
                size={14}
                className="shrink-0 text-kern-text-2"
              />
            ) : null}
            <Select.Value placeholder="Select field…" />
          </span>
          <ChevronDown size={14} className="shrink-0 text-kern-text-3" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-[60] max-h-72 overflow-hidden rounded-kern-md border border-kern-border bg-kern-bg shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-1">
              {selectFields.length === 0 ? (
                <p className="px-2 py-2 text-xs text-kern-text-3">No select fields yet.</p>
              ) : (
                selectFields.map((f) => (
                  <Select.Item
                    key={f.id}
                    value={f.slug}
                    className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-kern-surface-2"
                  >
                    <FieldTypeIcon type={f.type} size={14} className="text-kern-text-2" />
                    <Select.ItemText>{f.name}</Select.ItemText>
                  </Select.Item>
                ))
              )}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <p className="mb-2 text-xs font-medium text-kern-text-2">Card fields</p>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {orderedFields.map((f) => {
          const checked = cardSlugs.includes(f.slug);
          return (
            <label
              key={f.id}
              className="flex cursor-pointer items-center gap-2 rounded-kern-sm px-1 py-1 hover:bg-kern-surface-2"
            >
              <Checkbox.Root
                checked={checked}
                onCheckedChange={() => toggleCardField(f.slug)}
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                  'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
                )}
              >
                <Checkbox.Indicator className="text-kern-on-accent">
                  <Check size={12} strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <FieldTypeIcon type={f.type} size={14} className="shrink-0 text-kern-text-2" />
              <span className="min-w-0 flex-1 truncate text-sm text-kern-text">{f.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover
      align="end"
      trigger={
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="View options">
          <MoreHorizontal size={16} />
        </Button>
      }
    >
      {content}
    </Popover>
  );
}
