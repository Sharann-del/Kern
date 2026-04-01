import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { upsertIcsFields } from '../_shared/ics-fields.ts';

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

function parseIcsDate(val?: string): string | null {
  if (!val) return null;
  // Basic ICS Date parsing: YYYYMMDDTHHMMSSZ, YYYYMMDDTHHMMSS, YYYYMMDD
  const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [_, y, mo, d, h, mi, s, z] = m;
  const year = parseInt(y, 10);
  const month = parseInt(mo, 10) - 1;
  const day = parseInt(d, 10);
  if (h) {
    const hour = parseInt(h, 10);
    const minute = parseInt(mi, 10);
    const second = parseInt(s, 10);
    if (z) {
      return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
    }
    return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
  }
  return new Date(Date.UTC(year, month, day)).toISOString();
}

function parseIcs(ics: string): { feedTitle: string; items: any[] } {
  const events = [];
  let inEvent = false;
  let currentEvent: any = {};
  
  const m = ics.match(/^X-WR-CALNAME:(.+)$/m);
  const feedTitle = m?.[1]?.trim() ?? 'ICS Calendar';
  
  const lines = ics.split(/\r?\n/);
  const unfolded: string[] = [];
  for (const line of lines) {
    if (line.match(/^[ \t]/)) {
      if (unfolded.length > 0) unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      events.push(currentEvent);
    } else if (inEvent) {
      const match = line.match(/^([^;:]+)(?:;[^:]+)?:(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2];
        value = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
        currentEvent[key] = value;
      }
    }
  }
  return { feedTitle, items: events };
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
  collection: { id: string; live_source_config: Record<string, unknown> | null }
): Promise<void> {
  const cfg = collection.live_source_config || {};
  const calendarUrl = typeof cfg.calendar_url === 'string' ? cfg.calendar_url.trim() : '';
  const calendarFilePath = typeof cfg.calendar_file_path === 'string' ? cfg.calendar_file_path.trim() : '';

  if (!calendarUrl && !calendarFilePath) {
    throw new Error('Missing calendar_url or calendar_file_path in live_source_config');
  }

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    await upsertIcsFields(supabase, collection.id, userId);

    let ics = '';

    if (calendarFilePath) {
      const { data, error } = await supabase.storage.from('kern-files').download(calendarFilePath);
      if (error) throw new Error(`Could not download file: ${error.message}`);
      if (!data) throw new Error('File download was empty');
      ics = await data.text();
    } else {
      const fetchUrl = calendarUrl.replace(/^webcal:\/\//i, 'https://');
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Kern-ICS-Sync/1.0',
          Accept: 'text/calendar, text/plain, */*',
        },
      });
      if (!response.ok) {
        throw new Error(`Calendar fetch ${response.status}: ${fetchUrl}`);
      }
      ics = await response.text();
    }
    const parsed = parseIcs(ics);
    const rowsMap = new Map<string, RowInsert>();
    
    for (const it of parsed.items) {
      const extId = (it.UID || crypto.randomUUID()).slice(0, 2000);
      rowsMap.set(extId, {
        collection_id: collection.id,
        user_id: userId,
        external_id: extId,
        data: {
          name: it.SUMMARY || '(Untitled)',
          start_date: parseIcsDate(it.DTSTART) || null,
          end_date: parseIcsDate(it.DTEND) || null,
          description: it.DESCRIPTION || '',
          location: it.LOCATION || '',
        },
        sort_order: 0,
      });
    }

    const rows = Array.from(rowsMap.values());

    await upsertRows(supabase, rows);

    const { error: doneErr } = await supabase
      .from('collections')
      .update({ sync_status: 'idle', last_synced_at: new Date().toISOString(), sync_error_message: null })
      .eq('id', collection.id)
      .eq('user_id', userId);
    if (doneErr) throw doneErr;
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as any)?.message || String(e);
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
    .eq('live_source_type', 'ics_calendar');

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
      const msg = e instanceof Error ? e.message : (e as any)?.message || String(e);
      errors.push(`${col.id}: ${msg}`);
    }
  }

  if (errors.length > 0 && errors.length === list.length) {
    return jsonResponse({ error: errors.join('; ') }, 200);
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
    console.error('sync-ics unhandled:', msg);
    return jsonResponse({ error: `sync-ics crashed: ${msg}` }, 500);
  }
});
