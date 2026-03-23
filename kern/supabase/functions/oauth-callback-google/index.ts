import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/crypto.ts';
import { upsertGoogleCalendarFields } from '../_shared/google-calendar-fields.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Body = {
  code?: string;
  collection_id?: string;
  redirect_uri?: string;
  calendar_id?: string;
  sync_days_back?: number;
};

function isAllowedGoogleRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.pathname.replace(/\/$/, '') !== '/oauth/callback/google') return false;
    if (u.protocol === 'https:') return true;
    if (u.protocol !== 'http:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function handleOAuthCallbackGoogle(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const collectionId = typeof body.collection_id === 'string' ? body.collection_id : '';
  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : '';
  const calendarId = typeof body.calendar_id === 'string' && body.calendar_id.trim() ? body.calendar_id.trim() : 'primary';
  const syncDaysBack =
    typeof body.sync_days_back === 'number' && [30, 90, 365].includes(body.sync_days_back) ? body.sync_days_back : 90;

  if (!code || !collectionId) {
    return jsonResponse({ error: 'Missing code or collection_id' }, 400);
  }
  if (!redirectUri || !isAllowedGoogleRedirect(redirectUri)) {
    return jsonResponse({ error: 'Invalid or missing redirect_uri' }, 400);
  }

  const requiredKeys = [
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ] as const;
  const missing = requiredKeys.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    return jsonResponse({ error: `Missing secrets: ${missing.join(', ')}` }, 500);
  }

  const keyHex = Deno.env.get('ENCRYPTION_KEY')!;
  const gClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const gSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: collection, error: colErr } = await supabase
    .from('collections')
    .select('id, user_id')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .single();

  if (colErr || !collection) {
    return jsonResponse({ error: 'Collection not found' }, 404);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: gClientId,
      client_secret: gSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.refresh_token || typeof tokenJson.expires_in !== 'number') {
    const msg = tokenJson.error_description ?? tokenJson.error ?? 'Google token exchange failed';
    return jsonResponse({ error: msg }, 400);
  }

  const expiresAtMs = Date.now() + tokenJson.expires_in * 1000;
  const tokenPayload = JSON.stringify({
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
    expires_at_ms: expiresAtMs,
  });
  const encryptedTokens = await encrypt(tokenPayload, keyHex);

  const liveSourceConfig = {
    encrypted_tokens: encryptedTokens,
    calendar_id: calendarId,
    sync_days_back: syncDaysBack,
  };

  const { error: updErr } = await supabase
    .from('collections')
    .update({
      is_live_source: true,
      live_source_type: 'google_calendar_events',
      live_source_config: liveSourceConfig,
      sync_status: 'syncing',
      sync_error_message: null,
    })
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (updErr) {
    return jsonResponse({ error: updErr.message ?? 'Update failed' }, 500);
  }

  try {
    await upsertGoogleCalendarFields(supabase, collectionId, userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from('collections')
      .update({
        is_live_source: false,
        live_source_type: null,
        live_source_config: null,
        sync_status: 'idle',
        sync_error_message: null,
        last_synced_at: null,
      })
      .eq('id', collectionId)
      .eq('user_id', userId);
    return jsonResponse({ error: `Could not create calendar fields: ${message}` }, 500);
  }

  const syncUrl = `${url}/functions/v1/sync-google-calendar`;
  const syncRes = await fetch(syncUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ collection_id: collectionId }),
  });

  if (!syncRes.ok) {
    const errText = await syncRes.text();
    let detail = errText.slice(0, 400);
    try {
      const j = JSON.parse(errText) as { error?: unknown };
      if (typeof j.error === 'string') detail = j.error;
    } catch {
      /* keep */
    }
    await supabase
      .from('collections')
      .update({
        sync_status: 'error',
        sync_error_message: `Initial sync failed: ${detail}`,
      })
      .eq('id', collectionId)
      .eq('user_id', userId);
    return jsonResponse({ error: `Initial sync failed: ${detail}` }, 500);
  }

  return jsonResponse({ success: true, collection_id: collectionId });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }
  try {
    return await handleOAuthCallbackGoogle(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('oauth-callback-google unhandled:', msg);
    return jsonResponse({ error: `oauth-callback-google crashed: ${msg}` }, 500);
  }
});
