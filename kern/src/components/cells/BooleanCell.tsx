import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import type { CellComponentProps } from '@/components/cells/types';
import { cn } from '@/lib/utils';

export function BooleanCell({ value, row: _row, onSave }: CellComponentProps) {
  void _row;
  const checked = value === true || value === 'true';

  return (
    <div className="flex h-full w-full items-center justify-center px-2">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(c) => onSave(c === true)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
          'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox.Indicator className="text-kern-on-accent">
          <Check size={12} strokeWidth={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>
    </div>
  );
}
