import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt } from '../_shared/crypto.ts';
import {
  ensureNotionFieldsFromSchema,
  extractNotionPageValue,
} from '../_shared/notion-fields.ts';

const NOTION_VERSION = '2022-06-28';

type RowInsert = {
  collection_id: string;
  user_id: string;
  external_id: string;
  data: Record<string, unknown>;
  sort_order: number;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...notionHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

async function upsertRows(supabase: ReturnType<typeof createClient>, rows: RowInsert[]): Promise<void> {
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('rows').upsert(chunk, {
      onConflict: 'collection_id,external_id',
      ignoreDuplicates: false,
    });
    if (error) throw error;
  }
}

async function syncCollection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  collection: {
    id: string;
    user_id: string;
    live_source_config: Record<string, unknown> | null;
  },
  keyHex: string
): Promise<void> {
  const cfg = collection.live_source_config;
  const enc = cfg && typeof cfg.access_token === 'string' ? cfg.access_token : null;
  const databaseId = cfg && typeof cfg.database_id === 'string' ? cfg.database_id.trim() : '';
  if (!enc) throw new Error('Missing encrypted access_token in live_source_config');
  if (!databaseId) throw new Error('Missing database_id — pick a Notion database first');

  const accessToken = await decrypt(enc, keyHex);

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    const dbJson = await notionJson<{ properties: Record<string, Record<string, unknown>> }>(
      `https://api.notion.com/v1/databases/${databaseId}`,
      accessToken
    );
    const properties = dbJson.properties ?? {};

    await ensureNotionFieldsFromSchema(supabase, collection.id, userId, properties);

    const { data: fieldRows, error: fErr } = await supabase
      .from('fields')
      .select('name, slug')
      .eq('collection_id', collection.id);
    if (fErr) throw fErr;

    const nameToSlug = new Map<string, string>();
    for (const f of fieldRows ?? []) {
      nameToSlug.set(f.name, f.slug);
    }

    const pages: { id: string; properties: Record<string, Record<string, unknown>> }[] = [];
    let cursor: string | undefined;
    do {
      const body: Record<string, unknown> = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const q = await notionJson<{
        results: { id: string; properties: Record<string, Record<string, unknown>> }[];
        has_more?: boolean;
        next_cursor?: string | null;
      }>(`https://api.notion.com/v1/databases/${databaseId}/query`, accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      for (const r of q.results ?? []) {
        pages.push({ id: r.id, properties: r.properties ?? {} });
      }
      cursor = q.has_more && q.next_cursor ? q.next_cursor : undefined;
    } while (cursor);

    const rows: RowInsert[] = [];
    let order = 0;
    for (const page of pages) {
      const data: Record<string, unknown> = {};
      for (const propName of Object.keys(properties)) {
        const slug = nameToSlug.get(propName);
        if (!slug) continue;
        const schema = properties[propName];
        if (!schema) continue;
        const val = extractNotionPageValue(page.properties[propName], schema);
        if (val === null || val === undefined) continue;
        if (val === '') continue;
        if (Array.isArray(val) && val.length === 0) continue;
        data[slug] = val;
      }
      rows.push({
        collection_id: collection.id,
        user_id: userId,
        external_id: page.id,
        data,
        sort_order: order++,
      });
    }

    await upsertRows(supabase, rows);

    const { error: doneErr } = await supabase
      .from('collections')
      .update({ sync_status: 'idle', last_synced_at: new Date().toISOString(), sync_error_message: null })
      .eq('id', collection.id)
      .eq('user_id', userId);
    if (doneErr) throw doneErr;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from('collections')
      .update({ sync_status: 'error', sync_error_message: message })
      .eq('id', collection.id)
      .eq('user_id', userId);
    throw e;
  }
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const requiredKeys = ['ENCRYPTION_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;
  const missing = requiredKeys.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    return jsonResponse(
      {
        error: `Missing Edge Function secrets: ${missing.join(', ')}.`,
      },
      500
    );
  }

  const keyHex = Deno.env.get('ENCRYPTION_KEY')!;
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: { collection_id?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as { collection_id?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const singleId = typeof body.collection_id === 'string' ? body.collection_id : null;

  let query = supabase
    .from('collections')
    .select('id, user_id, live_source_config')
    .eq('user_id', userId)
    .eq('live_source_type', 'notion_database');

  if (singleId) {
    query = query.eq('id', singleId);
  }

  const { data: collections, error: listErr } = await query;
  if (listErr) {
    return jsonResponse({ error: listErr.message ?? 'Failed to list collections' }, 500);
  }

  const list = (collections ?? []).filter((c) => {
    const cfg = c.live_source_config as Record<string, unknown> | null;
    const dbId = cfg && typeof cfg.database_id === 'string' ? cfg.database_id.trim() : '';
    return Boolean(dbId);
  });

  if (list.length === 0) {
    return jsonResponse({ ok: true, synced: 0 });
  }

  const errors: string[] = [];
  for (const col of list) {
    try {
      await syncCollection(supabase, userId, col, keyHex);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${col.id}: ${msg}`);
    }
  }

  if (errors.length > 0 && errors.length === list.length) {
    return jsonResponse({ error: errors.join('; ') }, 500);
  }

  return jsonResponse({ ok: true, synced: list.length, warnings: errors.length ? errors : undefined });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    return await handleRequest(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sync-notion unhandled:', msg);
    return jsonResponse({ error: `sync-notion crashed: ${msg}` }, 500);
  }
});
