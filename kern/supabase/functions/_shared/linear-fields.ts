import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { slugify } from './slugify.ts';

type FieldRow = {
  name: string;
  slug: string;
  type: string;
  options?: unknown;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
};

const PRIORITY_LABELS = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'] as const;

const PALETTE = ['#4a7ce0', '#52a869', '#d4a847', '#e05252', '#8b5cf6', '#3d9e8c', '#d45c8a', '#666666'];

function pickColor(i: number): string {
  return PALETTE[i % PALETTE.length]!;
}

function priorityOptions() {
  return {
    items: PRIORITY_LABELS.map((label, i) => ({
      id: `linear-prio-${i}`,
      label,
      color: pickColor(i),
      sort_order: i,
    })),
  };
}

function statusOptionsFromStates(stateNames: string[]) {
  const unique = [...new Set(stateNames.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    items: unique.map((name, i) => ({
      id: `linear-state-${slugify(name)}`,
      label: name,
      color: pickColor(i),
      sort_order: i,
    })),
  };
}

function baseFields(statusItems: { items: { id: string; label: string; color: string; sort_order: number }[] }): FieldRow[] {
  return [
    {
      name: 'Name',
      slug: 'name',
      type: 'text',
      is_required: true,
      is_primary: true,
      is_hidden_by_default: false,
      sort_order: 0,
    },
    {
      name: 'Status',
      slug: 'status',
      type: 'select',
      options: statusItems,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 1,
    },
    {
      name: 'Priority',
      slug: 'priority',
      type: 'select',
      options: priorityOptions(),
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 2,
    },
    {
      name: 'Assignee',
      slug: 'assignee',
      type: 'text',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 3,
    },
    {
      name: 'Team',
      slug: 'team',
      type: 'text',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 4,
    },
    {
      name: 'Labels',
      slug: 'labels',
      type: 'text',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 5,
    },
    {
      name: 'Due date',
      slug: 'due_date',
      type: 'date',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 6,
    },
    {
      name: 'URL',
      slug: 'url',
      type: 'url',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 7,
    },
    {
      name: 'Created',
      slug: 'created_at',
      type: 'datetime',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 8,
    },
    {
      name: 'Description',
      slug: 'description',
      type: 'text',
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 9,
    },
  ];
}

export async function upsertLinearFields(
  supabase: SupabaseClient,
  collectionId: string,
  userId: string,
  stateNames: string[]
): Promise<void> {
  const statusItems = statusOptionsFromStates(stateNames);
  const defs = baseFields(statusItems);
  const rows = defs.map((d) => ({
    collection_id: collectionId,
    user_id: userId,
    name: d.name,
    slug: d.slug,
    type: d.type,
    options: d.options ?? null,
    is_required: d.is_required,
    is_primary: d.is_primary,
    is_hidden_by_default: d.is_hidden_by_default,
    sort_order: d.sort_order,
  }));

  const { error } = await supabase.from('fields').upsert(rows, { onConflict: 'collection_id,slug' });
  if (error) throw error;

  await supabase.from('fields').update({ is_primary: false }).eq('collection_id', collectionId);
  const { error: pErr } = await supabase.from('fields').update({ is_primary: true }).eq('collection_id', collectionId).eq('slug', 'name');
  if (pErr) throw pErr;
}

export function priorityOptionId(priority: number | null | undefined): string {
  const p = priority == null || !Number.isFinite(priority) ? 0 : Math.max(0, Math.min(4, Math.round(priority)));
  return `linear-prio-${p}`;
}

export function stateOptionId(stateName: string): string {
  return `linear-state-${slugify(stateName)}`;
}
