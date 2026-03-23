import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt, encrypt } from '../_shared/crypto.ts';
import { upsertGoogleCalendarFields } from '../_shared/google-calendar-fields.ts';

type RowInsert = {
  collection_id: string;
  user_id: string;
  external_id: string;
  data: Record<string, unknown>;
  sort_order: number;
};

type TokenPayload = {
  access_token: string;
  refresh_token: string;
  expires_at_ms: number;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function upsertRows(
  supabase: ReturnType<typeof createClient>,
  rows: RowInsert[]
): Promise<void> {
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

type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type GCalListResponse = {
  items?: GCalEvent[];
  nextPageToken?: string;
};

function mapEvent(ev: GCalEvent, userId: string, collectionId: string): RowInsert {
  const allDay = !ev.start?.dateTime && Boolean(ev.start?.date);
  const startVal = ev.start?.dateTime ?? ev.start?.date ?? '';
  const endVal = ev.end?.dateTime ?? ev.end?.date ?? '';
  return {
    collection_id: collectionId,
    user_id: userId,
    external_id: ev.id,
    data: {
      name: ev.summary ?? '(No title)',
      start_datetime: startVal,
      end_datetime: endVal,
      description: ev.description ?? null,
      location: ev.location ?? null,
      status: ev.status ?? '',
      all_day: allDay,
    },
    sort_order: 0,
  };
}

async function ensureFieldsIfEmpty(
  supabase: ReturnType<typeof createClient>,
  collectionId: string,
  userId: string
): Promise<void> {
  const { data: existing, error } = await supabase.from('fields').select('id').eq('collection_id', collectionId).limit(1);
  if (error) throw error;
  if (existing && existing.length > 0) return;
  await upsertGoogleCalendarFields(supabase, collectionId, userId);
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const j = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!resp.ok || !j.access_token || typeof j.expires_in !== 'number') {
    throw new Error(j.error_description ?? j.error ?? 'Google token refresh failed');
  }
  return {
    access_token: j.access_token,
    expires_in: j.expires_in,
    refresh_token: j.refresh_token,
  };
}

async function syncCollection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  collection: {
    id: string;
    live_source_config: Record<string, unknown> | null;
  },
  keyHex: string,
  googleClientId: string,
  googleClientSecret: string
): Promise<void> {
  const cfg = collection.live_source_config;
  const enc =
    cfg && typeof cfg.encrypted_tokens === 'string' ? cfg.encrypted_tokens : null;
  if (!enc) throw new Error('Missing encrypted_tokens in live_source_config');

  const calendarIdRaw = cfg && typeof cfg.calendar_id === 'string' ? cfg.calendar_id.trim() : 'primary';
  const calendarId = encodeURIComponent(calendarIdRaw || 'primary');
  const syncDaysBack =
    typeof cfg?.sync_days_back === 'number' && Number.isFinite(cfg.sync_days_back)
      ? Math.min(3650, Math.max(1, cfg.sync_days_back))
      : 90;

  let tokens: TokenPayload = JSON.parse(await decrypt(enc, keyHex)) as TokenPayload;

  if (Date.now() > tokens.expires_at_ms - 300_000) {
    const refreshed = await refreshAccessToken(tokens.refresh_token, googleClientId, googleClientSecret);
    tokens = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
      expires_at_ms: Date.now() + refreshed.expires_in * 1000,
    };
    const newEnc = await encrypt(JSON.stringify(tokens), keyHex);
    const nextCfg = {
      ...cfg,
      encrypted_tokens: newEnc,
      calendar_id: calendarIdRaw,
      sync_days_back: syncDaysBack,
    };
    const { error: upCfgErr } = await supabase
      .from('collections')
      .update({ live_source_config: nextCfg })
      .eq('id', collection.id)
      .eq('user_id', userId);
    if (upCfgErr) throw upCfgErr;
  }

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    await ensureFieldsIfEmpty(supabase, collection.id, userId);

    const timeMin = new Date(Date.now() - syncDaysBack * 24 * 60 * 60 * 1000).toISOString();
    const rows: RowInsert[] = [];
    let pageToken: string | undefined;

    do {
      const u = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
      );
      u.searchParams.set('maxResults', '250');
      u.searchParams.set('singleEvents', 'true');
      u.searchParams.set('orderBy', 'startTime');
      u.searchParams.set('timeMin', timeMin);
      if (pageToken) u.searchParams.set('pageToken', pageToken);

      const res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Google Calendar ${res.status}: ${t.slice(0, 280)}`);
      }
      const list = (await res.json()) as GCalListResponse;
      for (const ev of list.items ?? []) {
        if (ev?.id) rows.push(mapEvent(ev, userId, collection.id));
      }
      pageToken = list.nextPageToken;
    } while (pageToken);

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

  const keyHex = Deno.env.get('ENCRYPTION_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!keyHex || !url || !anonKey || !googleClientId || !googleClientSecret) {
    const missing = ['ENCRYPTION_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter(
      (k) => !Deno.env.get(k)
    );
    return jsonResponse({ error: `Missing secrets: ${missing.join(', ')}` }, 500);
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
    .eq('live_source_type', 'google_calendar_events');

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
      await syncCollection(supabase, userId, col, keyHex, googleClientId, googleClientSecret);
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
    console.error('sync-google-calendar unhandled:', msg);
    return jsonResponse({ error: `sync-google-calendar crashed: ${msg}` }, 500);
  }
});
