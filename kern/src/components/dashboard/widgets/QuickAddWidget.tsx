import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCollectionById } from '@/hooks/useCollections';
import { useFields } from '@/hooks/useFields';
import { useCreateRow } from '@/hooks/useRows';

export type QuickAddWidgetProps = {
  config: { collection_id: string; prefill?: Record<string, unknown> };
};

export function QuickAddWidget({ config }: QuickAddWidgetProps) {
  const { data: collection, isLoading: colLoading } = useCollectionById(config.collection_id);
  const { data: fields = [], isLoading: fieldsLoading } = useFields(config.collection_id);
  const createRow = useCreateRow();
  const [value, setValue] = useState('');
  const [added, setAdded] = useState(false);

  const primary = fields.find((f) => f.is_primary);
  const prefill = config.prefill && typeof config.prefill === 'object' && !Array.isArray(config.prefill)
    ? (config.prefill as Record<string, unknown>)
    : {};
  const prefillKeys = Object.keys(prefill).filter((k) => k !== primary?.slug).slice(0, 2);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!primary?.slug) return;
    const trimmed = value.trim();
    if (!trimmed && Object.keys(prefill).length === 0) return;

    const data: Record<string, unknown> = { ...prefill };
    if (trimmed) {
      data[primary.slug] = trimmed;
    }

    createRow.mutate(
      { collectionId: config.collection_id, data },
      {
        onSuccess: () => {
          setAdded(true);
          setValue('');
          window.setTimeout(() => setAdded(false), 2000);
        },
      }
    );
  };

  if (colLoading || fieldsLoading || !collection) {
    return <p className="text-xs text-kern-text-3">Loading…</p>;
  }

  if (!primary) {
    return <p className="text-xs text-kern-text-3">No primary field configured.</p>;
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        {collection.icon ? (
          <span className="text-lg leading-none" aria-hidden>
            {collection.icon}
          </span>
        ) : null}
        <span className="text-sm font-medium text-kern-text">{collection.name}</span>
      </div>
      {prefillKeys.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {prefillKeys.map((key) => (
            <span
              key={key}
              className="rounded-kern-sm border border-kern-border bg-kern-surface-2 px-2 py-0.5 text-xs text-kern-text-2"
            >
              {key}: {String(prefill[key])}
            </span>
          ))}
        </div>
      ) : null}
      <Input
        autoFocus={false}
        placeholder={primary.name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={createRow.isPending || added}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={createRow.isPending} disabled={added}>
          Add
        </Button>
        {added ? <span className="text-xs text-kern-text-2">Added! ✓</span> : null}
      </div>
    </form>
  );
}
