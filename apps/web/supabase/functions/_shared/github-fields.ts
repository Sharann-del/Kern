import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

type FieldInsert = {
  collection_id: string;
  user_id: string;
  name: string;
  slug: string;
  type: string;
  options?: unknown;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
};

const PR_FIELDS: FieldInsert[] = [
  { name: 'Name', slug: 'name', type: 'text', is_required: true, is_primary: true, is_hidden_by_default: false, sort_order: 0 },
  { name: 'Status', slug: 'status', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 1 },
  { name: 'Repository', slug: 'repo', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 2 },
  { name: 'Branch', slug: 'branch', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 3 },
  { name: 'Author', slug: 'author', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 4 },
  { name: 'URL', slug: 'url', type: 'url', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 5 },
  { name: 'PR #', slug: 'pr_number', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 6 },
  { name: 'Created', slug: 'created_at', type: 'datetime', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 7 },
  { name: 'Merged', slug: 'merged_at', type: 'datetime', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 8 },
];

const ISSUE_FIELDS: FieldInsert[] = [
  { name: 'Name', slug: 'name', type: 'text', is_required: true, is_primary: true, is_hidden_by_default: false, sort_order: 0 },
  { name: 'State', slug: 'state', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 1 },
  { name: 'Repository', slug: 'repo', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 2 },
  { name: 'Author', slug: 'author', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 3 },
  { name: 'URL', slug: 'url', type: 'url', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 4 },
  { name: 'Issue #', slug: 'issue_number', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 5 },
  { name: 'Created', slug: 'created_at', type: 'datetime', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 6 },
  { name: 'Closed', slug: 'closed_at', type: 'datetime', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 7 },
];

const REPO_FIELDS: FieldInsert[] = [
  { name: 'Name', slug: 'name', type: 'text', is_required: true, is_primary: true, is_hidden_by_default: false, sort_order: 0 },
  { name: 'Description', slug: 'description', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 1 },
  { name: 'Private', slug: 'is_private', type: 'boolean', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 2 },
  { name: 'Default branch', slug: 'default_branch', type: 'text', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 3 },
  { name: 'URL', slug: 'url', type: 'url', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 4 },
  { name: 'Stars', slug: 'stars', type: 'number', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 5 },
  { name: 'Updated', slug: 'updated_at', type: 'datetime', is_required: false, is_primary: false, is_hidden_by_default: false, sort_order: 6 },
];

function fieldsForSyncType(syncType: string): FieldInsert[] {
  if (syncType === 'prs') return PR_FIELDS;
  if (syncType === 'issues') return ISSUE_FIELDS;
  if (syncType === 'repos') return REPO_FIELDS;
  return PR_FIELDS;
}

export async function upsertGithubFields(
  supabase: SupabaseClient,
  collectionId: string,
  userId: string,
  syncType: string
): Promise<void> {
  const defs = fieldsForSyncType(syncType);
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

  const primarySlug = defs.find((d) => d.is_primary)?.slug;
  if (primarySlug) {
    await supabase.from('fields').update({ is_primary: false }).eq('collection_id', collectionId);
    const { error: pErr } = await supabase.from('fields').update({ is_primary: true }).eq('collection_id', collectionId).eq('slug', primarySlug);
    if (pErr) throw pErr;
  }
}
