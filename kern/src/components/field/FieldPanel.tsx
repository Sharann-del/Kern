import * as Checkbox from '@radix-ui/react-checkbox';
import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FieldTypeGrid } from '@/components/field/FieldTypeGrid';
import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import { NumberFieldOptions } from '@/components/field/NumberFieldOptions';
import { RelationFieldOptions } from '@/components/field/RelationFieldOptions';
import { SelectOptionsEditor } from '@/components/field/SelectOptionsEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FIELD_TYPES, SELECT_COLORS } from '@/lib/constants';
import {
  useCreateField,
  useDeleteField,
  useUpdateField,
} from '@/hooks/useFields';
import { useCollections } from '@/hooks/useCollections';
import { cn } from '@/lib/utils';
import type {
  FieldOptions,
  FieldType,
  KernField,
  NumberFieldOptions as NumberOpts,
  RelationFieldOptions as RelationOpts,
  SelectFieldOptions,
  SelectOption,
} from '@/types/kern';

function defaultSelectItems(): SelectOption[] {
  return [
    {
      id: crypto.randomUUID(),
      label: 'Option 1',
      color: SELECT_COLORS[0] ?? '#6366f1',
      sort_order: 0,
    },
    {
      id: crypto.randomUUID(),
      label: 'Option 2',
      color: SELECT_COLORS[1] ?? '#a855f7',
      sort_order: 1,
    },
  ];
}

function initialSelectItems(field?: KernField): SelectOption[] {
  if (field && (field.type === 'select' || field.type === 'multi_select')) {
    const o = field.options as SelectFieldOptions | null;
    if (o?.items?.length) {
      return o.items.map((it, i) => ({ ...it, sort_order: i }));
    }
  }
  return defaultSelectItems();
}

function initialNumberOpts(field?: KernField): NumberOpts | null {
  if (field?.type === 'number' && field.options && typeof field.options === 'object') {
    return field.options as NumberOpts;
  }
  return {};
}

function initialRelationOpts(field: KernField | undefined, firstTargetId: string): RelationOpts | null {
  if (field?.type === 'relation' && field.options && typeof field.options === 'object') {
    return field.options as RelationOpts;
  }
  return { target_collection_id: firstTargetId, display: 'single' };
}

export type FieldPanelProps = {
  mode: 'create' | 'edit';
  collectionId: string;
  field?: KernField;
  onClose: () => void;
  /** When creating a field, insert at this `sort_order` (shifts existing fields). */
  createInsertSortOrder?: number;
};

export function FieldPanel({ mode, collectionId, field, onClose, createInsertSortOrder }: FieldPanelProps) {
  const { data: collections = [] } = useCollections();
  const firstTargetId = useMemo(
    () => collections.find((c) => c.id !== collectionId)?.id ?? '',
    [collections, collectionId]
  );

  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [name, setName] = useState(() => (mode === 'edit' && field ? field.name : ''));
  const [fieldType, setFieldType] = useState<FieldType>(() =>
    mode === 'edit' && field ? field.type : 'text'
  );
  const [selectItems, setSelectItems] = useState<SelectOption[]>(() => initialSelectItems(field));
  const [numberOpts, setNumberOpts] = useState<NumberOpts | null>(() => initialNumberOpts(field));
  const [relationOpts, setRelationOpts] = useState<RelationOpts | null>(() =>
    initialRelationOpts(field, firstTargetId)
  );
  const [isRequired, setIsRequired] = useState(() =>
    mode === 'edit' && field ? field.is_required : false
  );

  const typeMeta = FIELD_TYPES.find((t) => t.type === fieldType);

  const handleTypeChange = (t: FieldType) => {
    setFieldType(t);
    if (t === 'select' || t === 'multi_select') setSelectItems(defaultSelectItems());
    if (t === 'number') setNumberOpts({});
    if (t === 'relation') {
      const first = collections.find((c) => c.id !== collectionId)?.id ?? '';
      setRelationOpts({ target_collection_id: first, display: 'single' });
    }
  };

  const buildOptions = (): FieldOptions | undefined => {
    if (fieldType === 'select' || fieldType === 'multi_select') {
      return {
        items: selectItems.map((item, i) => ({ ...item, sort_order: i })),
      };
    }
    if (fieldType === 'number') {
      const n = numberOpts ?? {};
      return Object.keys(n).length ? n : null;
    }
    if (fieldType === 'relation') {
      if (!relationOpts?.target_collection_id) return undefined;
      return relationOpts;
    }
    return undefined;
  };

  const isLoading = createField.isPending || updateField.isPending || deleteField.isPending;

  const handleSubmit = () => {
    const options = buildOptions();
    if (fieldType === 'relation' && options === undefined) {
      return;
    }

    if (mode === 'create') {
      createField.mutate(
        {
          collectionId,
          name,
          type: fieldType,
          options: options ?? null,
          isRequired,
          ...(createInsertSortOrder !== undefined ? { insertAtSortOrder: createInsertSortOrder } : {}),
        },
        {
          onSuccess: () => {
            toast.success(`${name.trim()} field added`);
            onClose();
          },
        }
      );
    } else if (field) {
      updateField.mutate(
        {
          id: field.id,
          collectionId,
          name,
          isRequired,
          ...(options !== undefined ? { options } : {}),
        },
        { onSuccess: () => onClose() }
      );
    }
  };

  const handleDelete = () => {
    if (!field || field.is_primary) return;
    if (!window.confirm(`Delete field “${field.name}”? This cannot be undone.`)) return;
    deleteField.mutate(
      { id: field.id, collectionId, slug: field.slug },
      { onSuccess: () => onClose() }
    );
  };

  const canSubmit =
    name.trim().length > 0 &&
    (fieldType !== 'relation' || Boolean(relationOpts?.target_collection_id));

  return (
    <>
      <button
        type="button"
        className={cn(
          'fixed inset-0 z-[29] bg-black/20 transition-opacity duration-200',
          entered ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed bottom-0 right-0 top-12 z-30 flex w-[360px] max-w-full flex-col border-l border-kern-border bg-kern-bg shadow-ds-md transition-transform duration-200 ease-out',
          entered ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-kern-border px-4 py-3">
          <h2 className="text-sm font-semibold text-kern-text">
            {mode === 'create' ? 'Add field' : 'Edit field'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 p-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-6">
            <div>
              <Input
                label="Field name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={mode === 'create'}
                autoComplete="off"
              />
            </div>

            {mode === 'create' ? (
              <div>
                <p className="mb-2 text-xs font-medium text-kern-text-2">Field type</p>
                <FieldTypeGrid value={fieldType} onChange={handleTypeChange} />
              </div>
            ) : (
              <div>
                <p className="mb-1 text-xs text-kern-text-2">Field type</p>
                <div className="flex items-center gap-2 rounded-kern-md border border-kern-border bg-kern-surface px-3 py-2 text-sm text-kern-text-2">
                  <FieldTypeIcon type={fieldType} size={16} />
                  <span>{typeMeta?.label ?? fieldType}</span>
                </div>
              </div>
            )}

            {fieldType === 'select' || fieldType === 'multi_select' ? (
              <SelectOptionsEditor options={selectItems} onChange={setSelectItems} />
            ) : null}

            {fieldType === 'number' ? (
              <NumberFieldOptions options={numberOpts} onChange={setNumberOpts} />
            ) : null}

            {fieldType === 'relation' ? (
              <RelationFieldOptions
                options={relationOpts}
                onChange={setRelationOpts}
                currentCollectionId={collectionId}
              />
            ) : null}

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox.Root
                checked={isRequired}
                onCheckedChange={(c) => setIsRequired(c === true)}
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
                  'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
                )}
              >
                <Checkbox.Indicator className="text-kern-on-accent">
                  <Check size={12} strokeWidth={3} />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="text-sm text-kern-text">This field is required</span>
            </label>

            {mode === 'edit' && field && !field.is_primary ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="w-full"
                disabled={isLoading}
                onClick={handleDelete}
              >
                Delete field
              </Button>
            ) : null}
            {mode === 'edit' && field?.is_primary ? (
              <p className="text-xs text-kern-text-3">The primary field cannot be deleted.</p>
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-kern-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={createField.isPending || updateField.isPending}
            disabled={!canSubmit || isLoading}
            onClick={handleSubmit}
          >
            {mode === 'create' ? 'Add field' : 'Save changes'}
          </Button>
        </footer>
      </aside>
    </>
  );
}
