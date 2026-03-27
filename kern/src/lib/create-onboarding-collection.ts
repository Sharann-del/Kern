import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export type OnboardingTemplateId = 'books' | 'tasks';

function selectOptions(
  items: { id: string; label: string; color: string }[]
): { items: { id: string; label: string; color: string; sort_order: number }[] } {
  return {
    items: items.map((it, i) => ({ ...it, sort_order: i })),
  };
}

/**
 * Inserts a collection and full field schema for quick-start onboarding (no default Name field).
 */
export async function createOnboardingCollection(
  userId: string,
  template: OnboardingTemplateId
): Promise<{ id: string; slug: string }> {
  const { data: maxRow } = await supabase
    .from('collections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRow?.sort_order ?? -1) + 1;
  const slugSuffix = Date.now();
  const slug = template === 'books' ? `books-${slugSuffix}` : `tasks-${slugSuffix}`;

  const collectionRow =
    template === 'books'
      ? {
          user_id: userId,
          name: 'Books',
          slug,
          icon: '📚',
          color: '#52a869',
          description: null as string | null,
          is_live_source: false,
          sort_order: nextSort,
        }
      : {
          user_id: userId,
          name: 'Tasks',
          slug,
          icon: '🎯',
          color: '#6366f1',
          description: null as string | null,
          is_live_source: false,
          sort_order: nextSort,
        };

  const { data: created, error: cErr } = await supabase.from('collections').insert(collectionRow).select('id, slug').single();
  if (cErr) throw cErr;
  if (!created) throw new Error('No collection returned');

  const collectionId = created.id as string;

  const booksFields = [
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Title',
      slug: 'title',
      type: 'text',
      options: null as Json | null,
      is_required: false,
      is_primary: true,
      is_hidden_by_default: false,
      sort_order: 0,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Author',
      slug: 'author',
      type: 'text',
      options: null,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 1,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Status',
      slug: 'status',
      type: 'select',
      options: selectOptions([
        { id: 'books-st-toread', label: 'To read', color: '#888888' },
        { id: 'books-st-reading', label: 'Reading', color: '#4a7ce0' },
        { id: 'books-st-read', label: 'Read', color: '#52a869' },
      ]) as unknown as Json,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 2,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Rating',
      slug: 'rating',
      type: 'number',
      options: { min: 0, max: 5, decimal_places: 0 } as unknown as Json,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 3,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Date Finished',
      slug: 'date_finished',
      type: 'date',
      options: null,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 4,
    },
  ];

  const tasksFields = [
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Title',
      slug: 'title',
      type: 'text',
      options: null,
      is_required: false,
      is_primary: true,
      is_hidden_by_default: false,
      sort_order: 0,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Status',
      slug: 'status',
      type: 'select',
      options: selectOptions([
        { id: 'tasks-st-todo', label: 'To do', color: '#888888' },
        { id: 'tasks-st-doing', label: 'In progress', color: '#4a7ce0' },
        { id: 'tasks-st-done', label: 'Done', color: '#52a869' },
      ]) as unknown as Json,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 1,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Due Date',
      slug: 'due_date',
      type: 'date',
      options: null,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 2,
    },
    {
      collection_id: collectionId,
      user_id: userId,
      name: 'Priority',
      slug: 'priority',
      type: 'select',
      options: selectOptions([
        { id: 'tasks-pr-low', label: 'Low', color: '#888888' },
        { id: 'tasks-pr-med', label: 'Medium', color: '#d4a847' },
        { id: 'tasks-pr-high', label: 'High', color: '#e05252' },
      ]) as unknown as Json,
      is_required: false,
      is_primary: false,
      is_hidden_by_default: false,
      sort_order: 3,
    },
  ];

  const fieldRows = template === 'books' ? booksFields : tasksFields;
  const { error: fErr } = await supabase.from('fields').insert(fieldRows);
  if (fErr) throw fErr;

  return { id: collectionId, slug: created.slug as string };
}
