import { COLLECTION_COLORS } from '@/constants';
export type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLLECTION_COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={selected}
            className="h-5 w-5 shrink-0 cursor-pointer rounded-full border border-kern-border"
            style={{
              backgroundColor: c,
              ...(selected
                ? { boxShadow: `0 0 0 2px ${c}, 0 0 0 4px var(--kern-bg)` }
                : {}),
            }}
            onClick={() => onChange(c)}
          />
        );
      })}
    </div>
  );
}
