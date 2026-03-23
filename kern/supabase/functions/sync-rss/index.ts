import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { upsertRssFields } from '../_shared/rss-fields.ts';

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function getTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
    'i'
  );
  const m = xml.match(re);
  return m?.[1]?.trim() ?? '';
}

function getAtomLinkHref(entry: string): string {
  const m = entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return m?.[1]?.trim() ?? '';
}

function parseRss(xml: string): { feedTitle: string; items: { title: string; link: string; pubDate: string; description: string; author: string; guid: string }[] } {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channel = channelMatch?.[1] ?? xml;
  const feedTitle = getTag(channel, 'title') || 'RSS Feed';
  const itemBlocks = channel.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items = itemBlocks.map((block) => {
    const title = getTag(block, 'title');
    let link = getTag(block, 'link');
    if (!link) {
      const lm = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      link = lm?.[1]?.trim() ?? '';
    }
    const pubDate = getTag(block, 'pubDate') || getTag(block, 'dc:date') || '';
    const description = getTag(block, 'description') || getTag(block, 'content:encoded') || '';
    const author = getTag(block, 'author') || getTag(block, 'dc:creator') || '';
    const guid = getTag(block, 'guid') || link || crypto.randomUUID();
    return { title, link, pubDate, description, author, guid };
  });
  return { feedTitle, items };
}

function parseAtom(xml: string): { feedTitle: string; items: { title: string; link: string; pubDate: string; description: string; author: string; guid: string }[] } {
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i);
  const feed = feedMatch?.[1] ?? xml;
  const feedTitle = getTag(feed, 'title') || 'Atom Feed';
  const entries = feed.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const items = entries.map((entry) => {
    const title = getTag(entry, 'title');
    const link = getAtomLinkHref(entry);
    const pubDate = getTag(entry, 'updated') || getTag(entry, 'published') || '';
    const description = getTag(entry, 'summary') || getTag(entry, 'content') || '';
    const author = getTag(entry, 'name') || getTag(entry, 'author') || '';
    const idTag = getTag(entry, 'id');
    const guid = idTag || link || crypto.randomUUID();
    return { title, link, pubDate, description, author, guid };
  });
  return { feedTitle, items };
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

async function ensureRssFieldsIfEmpty(
  supabase: ReturnType<typeof createClient>,
  collectionId: string,
  userId: string
): Promise<void> {
  const { data: existing, error } = await supabase.from('fields').select('id').eq('collection_id', collectionId).limit(1);
  if (error) throw error;
  if (existing && existing.length > 0) return;
  await upsertRssFields(supabase, collectionId, userId);
}

async function syncCollection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  collection: { id: string; live_source_config: Record<string, unknown> | null }
): Promise<void> {
  const cfg = collection.live_source_config;
  const feedUrl = cfg && typeof cfg.feed_url === 'string' ? cfg.feed_url.trim() : '';
  if (!feedUrl) throw new Error('Missing feed_url in live_source_config');

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    await ensureRssFieldsIfEmpty(supabase, collection.id, userId);

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Kern-RSS-Sync/1.0',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!response.ok) {
      throw new Error(`Feed fetch ${response.status}: ${feedUrl}`);
    }
    const xml = await response.text();
    const isAtom = /<feed[\s>]/i.test(xml);
    const parsed = isAtom ? parseAtom(xml) : parseRss(xml);
    const rows: RowInsert[] = [];
    for (const it of parsed.items) {
      const extId = it.guid || it.link || crypto.randomUUID();
      let publishedIso = '';
      try {
        if (it.pubDate) publishedIso = new Date(it.pubDate).toISOString();
      } catch {
        publishedIso = '';
      }
      rows.push({
        collection_id: collection.id,
        user_id: userId,
        external_id: extId.slice(0, 2000),
        data: {
          name: it.title || '(Untitled)',
          url: it.link || feedUrl,
          published_at: publishedIso || null,
          summary: stripHtml(it.description).slice(0, 8000),
          author: it.author,
          feed_name: parsed.feedTitle,
        },
        sort_order: 0,
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

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' }, 500);
  }

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
    .select('id, user_id, live_source_type, live_source_config')
    .eq('user_id', userId)
    .eq('live_source_type', 'rss_feed');

  if (singleId) query = query.eq('id', singleId);

  const { data: collections, error: listErr } = await query;
  if (listErr) {
    return jsonResponse({ error: listErr.message ?? 'List failed' }, 500);
  }

  const list = collections ?? [];
  if (list.length === 0) {
    return jsonResponse({ ok: true, synced: 0 });
  }

  const errors: string[] = [];
  for (const col of list) {
    try {
      await syncCollection(supabase, userId, col);
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
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }
  try {
    return await handleRequest(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sync-rss unhandled:', msg);
    return jsonResponse({ error: `sync-rss crashed: ${msg}` }, 500);
  }
});
