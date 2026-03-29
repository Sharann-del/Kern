import * as Select from '@radix-ui/react-select';
import {
  BarChart2,
  ChevronDown,
  List,
  PlusCircle,
  RefreshCw,
  Table2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCollections } from '@/hooks/useCollections';
import { useCreateWidget, useWidgets } from '@/hooks/useDashboard';
import { useFields } from '@/hooks/useFields';
import { useViews } from '@/hooks/useViews';
import { findFirstEmptySpot } from '@/lib/dashboard-grid';
import { cn } from '@/lib/utils';
import type { DashboardWidgetType } from '@/types/kern';

const TYPE_CARDS: { type: DashboardWidgetType; label: string; Icon: typeof BarChart2 }[] = [
  { type: 'collection_stats', label: 'Collection stats', Icon: BarChart2 },
  { type: 'recent_rows', label: 'Recent rows', Icon: List },
  { type: 'view_embed', label: 'View embed', Icon: Table2 },
  { type: 'live_source_status', label: 'Live source status', Icon: RefreshCw },
  { type: 'quick_add', label: 'Quick add', Icon: PlusCircle },
];

function KernSelect({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select.Root
      value={value.length > 0 ? value : undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        className={cn(
          'flex h-8 w-full items-center justify-between gap-2 rounded-kern-md border border-kern-border bg-kern-bg px-3 text-sm text-kern-text',
          'outline-none focus:ring-0 disabled:opacity-50'
        )}
      >
        <Select.Value placeholder={placeholder} />
        <ChevronDown size={14} className="shrink-0 text-kern-text-3" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-[120] max-h-56 overflow-y-auto rounded-kern-lg border border-kern-border bg-kern-bg p-1 shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-kern-surface-2"
              >
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export type AddWidgetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddWidgetModal({ open, onOpenChange }: AddWidgetModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<DashboardWidgetType | null>(null);
  const [collectionId, setCollectionId] = useState('');
  const [limit, setLimit] = useState('10');
  const [secondarySlug, setSecondarySlug] = useState('');
  const [viewId, setViewId] = useState('');
  const [title, setTitle] = useState('');
  const [prefillNote, setPrefillNote] = useState('');

  const { data: collections = [] } = useCollections();
  const { data: widgets = [] } = useWidgets();
  const createWidget = useCreateWidget();
  const { data: fields = [] } = useFields(collectionId);
  const { data: views = [] } = useViews(collectionId);

  const resetForm = () => {
    setStep(1);
    setSelectedType(null);
    setCollectionId('');
    setLimit('10');
    setSecondarySlug('');
    setViewId('');
    setTitle('');
    setPrefillNote('');
  };

  const handleModalOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
    }
    onOpenChange(next);
  };

  const handleCollectionChange = (id: string) => {
    setCollectionId(id);
    setSecondarySlug('');
    setViewId('');
  };

  const collectionOptions = useMemo(
    () => collections.map((c) => ({ value: c.id, label: c.name })),
    [collections]
  );

  const secondaryOptions = useMemo(() => {
    const primary = fields.find((f) => f.is_primary);
    return fields
      .filter((f) => f.id !== primary?.id)
      .map((f) => ({ value: f.slug, label: f.name }));
  }, [fields]);

  const viewOptions = useMemo(
    () => views.map((v) => ({ value: v.id, label: v.name })),
    [views]
  );

  const handleAdd = () => {
    if (!selectedType || !collectionId) {
      toast.error('Choose a widget type and collection.');
      return;
    }

    let config: Record<string, unknown> = { collection_id: collectionId };

    if (selectedType === 'recent_rows') {
      const lim = Number(limit) || 10;
      config = {
        collection_id: collectionId,
        limit: lim,
        show_fields: secondarySlug ? [secondarySlug] : [],
      };
    } else if (selectedType === 'view_embed') {
      if (!viewId) {
        toast.error('Select a view.');
        return;
      }
      config = { collection_id: collectionId, view_id: viewId };
    } else if (selectedType === 'quick_add') {
      let prefill: Record<string, unknown> | undefined;
      const raw = prefillNote.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            prefill = parsed as Record<string, unknown>;
          } else {
            toast.error('Prefill must be a JSON object.');
            return;
          }
        } catch {
          toast.error('Invalid JSON for prefill.');
          return;
        }
      }
      config = prefill ? { collection_id: collectionId, prefill } : { collection_id: collectionId };
    }

    const spot = findFirstEmptySpot(widgets);
    if (!spot) {
      toast.error('No free space on the dashboard grid.');
      return;
    }

    createWidget.mutate(
      {
        type: selectedType,
        title: title.trim() || null,
        config,
        position_x: spot.x,
        position_y: spot.y,
        width: 2,
        height: 2,
      },
      {
        onSuccess: () => {
          handleModalOpenChange(false);
        },
      }
    );
  };

  const footer =
    step === 1 ? null : (
      <div className="flex w-full items-center justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={createWidget.isPending}
          onClick={() => void handleAdd()}
        >
          Add widget
        </Button>
      </div>
    );

  return (
    <Modal
      open={open}
      onOpenChange={handleModalOpenChange}
      title={step === 1 ? 'Add widget' : 'Configure widget'}
      description={step === 1 ? 'Choose a widget type' : undefined}
      maxWidth={560}
      footer={footer}
    >
      {step === 1 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TYPE_CARDS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedType(type);
                setStep(2);
              }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-kern-lg border border-kern-border bg-kern-surface p-4 text-center transition-colors',
                'hover:border-kern-accent hover:bg-kern-surface-2'
              )}
            >
              <Icon size={22} className="text-kern-text-2" />
              <span className="text-sm font-medium text-kern-text">{label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-xs text-kern-text-2">Collection</p>
            <KernSelect
              value={collectionId}
              onValueChange={handleCollectionChange}
              placeholder="Select collection"
              options={collectionOptions}
            />
          </div>

          {selectedType === 'recent_rows' ? (
            <>
              <div>
                <p className="mb-1 text-xs text-kern-text-2">Limit</p>
                <KernSelect
                  value={limit}
                  onValueChange={setLimit}
                  placeholder="Limit"
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '20', label: '20' },
                  ]}
                  disabled={!collectionId}
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-kern-text-2">Secondary field</p>
                <KernSelect
                  value={secondarySlug || '__none__'}
                  onValueChange={(v) => setSecondarySlug(v === '__none__' ? '' : v)}
                  placeholder="Optional"
                  options={[{ value: '__none__', label: 'None' }, ...secondaryOptions]}
                  disabled={!collectionId || secondaryOptions.length === 0}
                />
              </div>
            </>
          ) : null}

          {selectedType === 'view_embed' ? (
            <div>
              <p className="mb-1 text-xs text-kern-text-2">View</p>
              {collectionId && views.length === 0 ? (
                <p className="text-xs text-kern-text-3">No views in this collection yet.</p>
              ) : (
                <KernSelect
                  value={viewId}
                  onValueChange={setViewId}
                  placeholder="Select view"
                  options={viewOptions}
                  disabled={!collectionId || views.length === 0}
                />
              )}
            </div>
          ) : null}

          {selectedType === 'quick_add' ? (
            <div>
              <p className="mb-1 text-xs text-kern-text-2">
                Optional prefill (JSON object). Rows will be created with these default values.
              </p>
              <textarea
                className={cn(
                  'min-h-[72px] w-full rounded-kern-md border border-kern-border bg-kern-bg px-3 py-2 text-sm text-kern-text',
                  'placeholder:text-kern-text-3 outline-none focus:ring-0'
                )}
                placeholder='e.g. {"status":"todo"}'
                value={prefillNote}
                onChange={(e) => setPrefillNote(e.target.value)}
              />
            </div>
          ) : null}

          <Input
            label="Title (optional)"
            placeholder="Widget title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
