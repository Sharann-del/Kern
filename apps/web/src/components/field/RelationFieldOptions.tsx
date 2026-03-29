import * as Checkbox from '@radix-ui/react-checkbox';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

import { useCollections } from '@/hooks/useCollections';
import { cn } from '@/lib/utils';
import type { RelationFieldOptions as RelationOpts } from '@/types/kern';

export type RelationFieldOptionsProps = {
  options: RelationOpts | null;
  onChange: (opts: RelationOpts) => void;
  currentCollectionId: string;
};

export function RelationFieldOptions({
  options,
  onChange,
  currentCollectionId,
}: RelationFieldOptionsProps) {
  const { data: collections = [] } = useCollections();
  const targets = collections.filter((c) => c.id !== currentCollectionId);

  const targetId = options?.target_collection_id ?? '';
  const display = options?.display ?? 'single';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs text-kern-text-2">Target collection</label>
        <Select.Root
          value={targetId || undefined}
          onValueChange={(value) =>
            onChange({ target_collection_id: value, display })
          }
        >
          <Select.Trigger
            className={cn(
              'flex h-8 w-full items-center justify-between gap-2 rounded-kern-md border border-kern-border bg-kern-bg px-3 text-sm text-kern-text outline-none',
              'focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30'
            )}
            aria-label="Target collection"
          >
            <Select.Value placeholder="Choose collection" />
            <Select.Icon>
              <ChevronDown size={14} className="text-kern-text-3" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[45] max-h-60 overflow-y-auto rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {targets.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-kern-text-3">No other collections yet.</p>
                ) : (
                  targets.map((c) => (
                    <Select.Item
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-text outline-none data-[highlighted]:bg-kern-surface-2"
                    >
                      <Select.ItemText>{c.name}</Select.ItemText>
                    </Select.Item>
                  ))
                )}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox.Root
          checked={display === 'multiple'}
          onCheckedChange={(checked) =>
            onChange({
              target_collection_id: targetId,
              display: checked === true ? 'multiple' : 'single',
            })
          }
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
            'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
          )}
        >
          <Checkbox.Indicator className="text-kern-on-accent">
            <Check size={12} strokeWidth={3} />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <span className="text-sm text-kern-text">Allow multiple links</span>
      </label>
    </div>
  );
}
