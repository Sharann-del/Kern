import * as Checkbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { NumberFieldOptions as NumberOpts } from '@/types/kern';

export type NumberFieldOptionsProps = {
  options: NumberOpts | null;
  onChange: (opts: NumberOpts) => void;
};

const DECIMAL_CHOICES = [0, 1, 2, 3, 4] as const;

export function NumberFieldOptions({ options, onChange }: NumberFieldOptionsProps) {
  const o = options ?? {};

  const patch = (p: Partial<NumberOpts>) => onChange({ ...o, ...p });

  const showProgress = Boolean(o.show_as_progress);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Unit"
          placeholder="e.g. kg, hrs, %"
          value={o.unit ?? ''}
          onChange={(e) => patch({ unit: e.target.value || undefined })}
        />
        <div>
          <label htmlFor="number-decimals" className="mb-1 block text-xs text-kern-text-2">
            Decimal places
          </label>
          <select
            id="number-decimals"
            className="h-8 w-full rounded-kern-md border border-kern-border bg-kern-bg px-3 text-sm text-kern-text outline-none focus:border-kern-accent focus:ring-2 focus:ring-kern-accent/30"
            value={o.decimal_places ?? 0}
            onChange={(e) => patch({ decimal_places: Number(e.target.value) })}
          >
            {DECIMAL_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox.Root
          checked={showProgress}
          onCheckedChange={(checked) =>
            patch({
              show_as_progress: checked === true,
              ...(checked !== true ? { min: undefined, max: undefined } : {}),
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
        <span className="text-sm text-kern-text">Show as progress bar</span>
      </label>

      {showProgress ? (
        <div className="grid grid-cols-2 gap-3 pl-6">
          <Input
            label="Min"
            type="number"
            value={o.min ?? ''}
            onChange={(e) =>
              patch({ min: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
          <Input
            label="Max"
            type="number"
            value={o.max ?? ''}
            onChange={(e) =>
              patch({ max: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
