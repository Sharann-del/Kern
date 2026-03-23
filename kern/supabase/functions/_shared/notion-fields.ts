import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { slugify } from './slugify.ts';

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

const SKIP_TYPES = new Set([
  'formula',
  'rollup',
  'created_by',
  'last_edited_by',
  'last_edited_time',
  'created_time',
  'button',
  'unique_id',
  'verification',
  'relation',
]);

const PALETTE = ['#4a7ce0', '#52a869', '#d4a847', '#e05252', '#8b5cf6', '#3d9e8c', '#d45c8a', '#666666'];

function pickColor(i: number): string {
  return PALETTE[i % PALETTE.length]!;
}

function plainFromRich(arr: unknown): string {
  if (!Array.isArray(arr)) return '';
  return (arr as { plain_text?: string }[]).map((t) => t.plain_text ?? '').join('');
}

function notionSelectOptions(prop: Record<string, unknown>): { id: string; label: string; color: string; sort_order: number }[] {
  const sel = prop.select as { options?: { name: string }[] } | undefined;
  const opts = sel?.options ?? [];
  return opts.map((o, i) => ({
    id: `notion-opt-${slugify(o.name)}`,
    label: o.name,
    color: pickColor(i),
    sort_order: i,
  }));
}

function notionMultiOptions(prop: Record<string, unknown>): { id: string; label: string; color: string; sort_order: number }[] {
  const ms = prop.multi_select as { options?: { name: string }[] } | undefined;
  const opts = ms?.options ?? [];
  return opts.map((o, i) => ({
    id: `notion-opt-${slugify(o.name)}`,
    label: o.name,
    color: pickColor(i),
    sort_order: i,
  }));
}

function notionStatusOptions(prop: Record<string, unknown>): { id: string; label: string; color: string; sort_order: number }[] {
  const st = prop.status as { options?: { name: string }[] } | undefined;
  const opts = st?.options ?? [];
  return opts.map((o, i) => ({
    id: `notion-status-${slugify(o.name)}`,
    label: o.name,
    color: pickColor(i),
    sort_order: i,
  }));
}

function fieldDefForProperty(
  propName: string,
  prop: Record<string, unknown>,
  sortOrder: number,
  kernSlug: string
): FieldInsert | null {
  const t = typeof prop.type === 'string' ? prop.type : '';
  if (SKIP_TYPES.has(t)) return null;

  if (t === 'title') {
    void kernSlug;
    return {
      collection_id: '',
      user_id: '',
      name: propName,
      slug: 'name',
      type: 'text',
      is_required: true,
      is_primary: true,
      is_hidden_by_default: false,
      sort_order: sortOrder,
    };
  }

  switch (t) {
    case 'rich_text':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'text',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'number':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'number',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'select':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'select',
        options: { items: notionSelectOptions(prop) },
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'multi_select':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'multi_select',
        options: { items: notionMultiOptions(prop) },
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'status':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'select',
        options: { items: notionStatusOptions(prop) },
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'date':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'date',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'checkbox':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'boolean',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'url':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'url',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'email':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'email',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'phone_number':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'phone',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'people':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'text',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    case 'files':
      return {
        collection_id: '',
        user_id: '',
        name: propName,
        slug: kernSlug,
        type: 'text',
        is_required: false,
        is_primary: false,
        is_hidden_by_default: false,
        sort_order: sortOrder,
      };
    default:
      return null;
  }
}

export async function ensureNotionFieldsFromSchema(
  supabase: SupabaseClient,
  collectionId: string,
  userId: string,
  properties: Record<string, Record<string, unknown>>
): Promise<void> {
  const { data: existingRows, error: exErr } = await supabase
    .from('fields')
    .select('slug, sort_order')
    .eq('collection_id', collectionId);
  if (exErr) throw exErr;

  const existingSlugs = new Set((existingRows ?? []).map((r) => r.slug));
  let maxOrder = (existingRows ?? []).reduce((m, r) => Math.max(m, r.sort_order), -1);

  const pendingSlugs = new Set<string>();
  const toInsert: FieldInsert[] = [];

  const propEntries = Object.entries(properties);
  for (const [propName, raw] of propEntries) {
    const prop = raw;
    const t = typeof prop.type === 'string' ? prop.type : '';
    if (SKIP_TYPES.has(t)) continue;

    let kernSlug: string;
    if (t === 'title') {
      if (existingSlugs.has('name')) continue;
      kernSlug = 'name';
    } else {
      kernSlug = slugify(propName) || `field-${maxOrder + 1 + toInsert.length + pendingSlugs.size}`;
      const base0 = kernSlug;
      let n = 2;
      while (existingSlugs.has(kernSlug) || pendingSlugs.has(kernSlug) || kernSlug === 'name') {
        kernSlug = `${base0}-${n}`;
        n++;
      }
    }

    if (existingSlugs.has(kernSlug)) continue;
    pendingSlugs.add(kernSlug);

    const def = fieldDefForProperty(propName, prop, maxOrder + 1 + toInsert.length, kernSlug);
    if (!def) {
      pendingSlugs.delete(kernSlug);
      continue;
    }

    toInsert.push({
      ...def,
      collection_id: collectionId,
      user_id: userId,
    });
  }

  if (toInsert.length === 0) {
    await supabase.from('fields').update({ is_primary: false }).eq('collection_id', collectionId);
    const { error: pErr } = await supabase.from('fields').update({ is_primary: true }).eq('collection_id', collectionId).eq('slug', 'name');
    if (pErr) throw pErr;
    return;
  }

  const rows = toInsert.map((d) => ({
    collection_id: d.collection_id,
    user_id: d.user_id,
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

export function extractNotionPageValue(
  prop: Record<string, unknown> | undefined,
  propSchema: Record<string, unknown> | undefined
): unknown {
  if (!prop || !propSchema) return null;
  const t = typeof prop.type === 'string' ? prop.type : propSchema.type;

  switch (t) {
    case 'title':
      return plainFromRich(prop.title as unknown) || null;
    case 'rich_text':
      return plainFromRich(prop.rich_text as unknown) || null;
    case 'number':
      return typeof prop.number === 'number' || prop.number === null ? prop.number : null;
    case 'select': {
      const sel = prop.select as { name?: string } | null | undefined;
      const name = sel?.name;
      if (!name) return null;
      return `notion-opt-${slugify(name)}`;
    }
    case 'multi_select': {
      const ms = prop.multi_select as { name: string }[] | undefined;
      if (!Array.isArray(ms) || ms.length === 0) return [];
      return ms.map((x) => `notion-opt-${slugify(x.name)}`);
    }
    case 'status': {
      const st = prop.status as { name?: string } | null | undefined;
      const name = st?.name;
      if (!name) return null;
      return `notion-status-${slugify(name)}`;
    }
    case 'date': {
      const d = prop.date as { start?: string } | null | undefined;
      return d?.start ?? null;
    }
    case 'checkbox':
      return Boolean(prop.checkbox);
    case 'url':
      return typeof prop.url === 'string' ? prop.url : null;
    case 'email':
      return typeof prop.email === 'string' ? prop.email : null;
    case 'phone_number':
      return typeof prop.phone_number === 'string' ? prop.phone_number : null;
    case 'people': {
      const ppl = prop.people as { name?: string }[] | undefined;
      if (!Array.isArray(ppl)) return null;
      return ppl.map((p) => p.name ?? '').filter(Boolean).join(', ') || null;
    }
    case 'files': {
      const files = prop.files as { type?: string; external?: { url?: string }; file?: { url?: string } }[] | undefined;
      if (!Array.isArray(files)) return null;
      const urls = files
        .map((f) => f.external?.url ?? f.file?.url ?? '')
        .filter(Boolean);
      return urls.length ? urls.join('\n') : null;
    }
    default:
      return null;
  }
}

export function extractDatabaseTitle(db: { title?: { plain_text?: string }[] }): string {
  return plainFromRich(db.title ?? []) || 'Notion database';
}
