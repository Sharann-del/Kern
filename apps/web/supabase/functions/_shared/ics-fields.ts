import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

type FieldRow = {
  collection_id: string;
  user_id: string;
  name: string;
  slug: string;
  type: string;
  options: unknown;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
};

const FIELDS: Omit<FieldRow, 'collection_id' | 'user_id'>[] = [
  { name: 'Title', slug: 'name', type: 'text', options: null, is_required: true, is_primary: true, is_hidden_by_default: false, sort_order: 0 },
  { name: 'Start Date', slug: 'start_date', type: 'datetime', options: null, is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 1 },
  { name: 'End Date', slug: 'end_date', type: 'datetime', options: null, is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 2 },
  { name: 'Description', slug: 'description', type: 'text', options: null, is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 3 },
  { name: 'Location', slug: 'location', type: 'text', options: null, is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 4 },
];

export async function upsertIcsFields(
  supabase: SupabaseClient,
  collectionId: string,
  userId: string
): Promise<void> {
  const rows = FIELDS.map((f) => ({
    collection_id: collectionId,
    user_id: userId,
    ...f,
  }));
  const { error } = await supabase.from('fields').upsert(rows, { onConflict: 'collection_id,slug' });
  if (error) throw error;
  await supabase.from('fields').update({ is_primary: false }).eq('collection_id', collectionId);
  const { error: pErr } = await supabase.from('fields').update({ is_primary: true }).eq('collection_id', collectionId).eq('slug', 'name');
  if (pErr) throw pErr;
}
