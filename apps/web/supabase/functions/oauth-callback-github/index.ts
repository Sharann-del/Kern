import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/crypto.ts';
import { upsertGithubFields } from '../_shared/github-fields.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type Body = {
  code?: string;
  collection_id?: string;
  sync_type?: string;
  repo_filter?: string | null;
  /** Must exactly match the redirect_uri sent to /login/oauth/authorize (GitHub requires it on token exchange). */
  redirect_uri?: string;
};

function isAllowedGithubOAuthRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.pathname.replace(/\/$/, '') !== '/oauth/callback/github') return false;
    if (u.protocol === 'https:') return true;
    if (u.protocol !== 'http:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function handleOAuthCallbackGithub(req: Request): Promise<Response> {
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
  const syncType = typeof body.sync_type === 'string' ? body.sync_type : '';
  const repoFilter =
    typeof body.repo_filter === 'string' && body.repo_filter.trim() ? body.repo_filter.trim() : null;

  const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : '';

  if (!code || !collectionId || !syncType) {
    return jsonResponse({ error: 'Missing code, collection_id, or sync_type' }, 400);
  }

  if (!redirectUri) {
    return jsonResponse(
      { error: 'Missing redirect_uri — must match the URL used when starting GitHub OAuth (…/oauth/callback/github).' },
      400
    );
  }

  if (!isAllowedGithubOAuthRedirect(redirectUri)) {
    return jsonResponse({ error: 'Invalid redirect_uri' }, 400);
  }

  if (!['prs', 'issues', 'repos'].includes(syncType)) {
    return jsonResponse({ error: 'Invalid sync_type' }, 400);
  }

  const requiredKeys = [
    'ENCRYPTION_KEY',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ] as const;
  const missing = requiredKeys.filter((k) => !Deno.env.get(k));
  if (missing.length > 0) {
    return jsonResponse(
      {
        error: `Missing Edge Function secrets: ${missing.join(', ')}. Set them in Dashboard → Project Settings → Edge Functions → Secrets (or supabase secrets set).`,
      },
      500
    );
  }

  const keyHex = Deno.env.get('ENCRYPTION_KEY')!;
  const clientId = Deno.env.get('GITHUB_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')!;
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

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kern-Live-Source/1.0',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg = tokenJson.error_description ?? tokenJson.error ?? 'Token exchange failed';
    return jsonResponse({ error: msg }, 400);
  }

  const accessToken = tokenJson.access_token;
  const encrypted = await encrypt(accessToken, keyHex);

  const liveSourceType = `github_${syncType}` as const;

  const { error: updErr } = await supabase
    .from('collections')
    .update({
      is_live_source: true,
      live_source_type: liveSourceType,
      live_source_config: {
        access_token: encrypted,
        sync_type: syncType,
        repo_filter: repoFilter,
      },
      sync_status: 'syncing',
      sync_error_message: null,
    })
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (updErr) {
    const msg =
      typeof updErr.message === 'string' && updErr.message.trim()
        ? updErr.message.trim()
        : 'Failed to update collection';
    return jsonResponse({ error: msg }, 500);
  }

  try {
    await upsertGithubFields(supabase, collectionId, userId, syncType);
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
    return jsonResponse(
      { error: `Could not create GitHub fields: ${message}. Collection left as manual; try Connect again.` },
      500
    );
  }

  const syncUrl = `${url}/functions/v1/sync-github`;
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
      const j = JSON.parse(errText) as Record<string, unknown>;
      const inner =
        typeof j.error === 'string'
          ? j.error
          : j.error && typeof j.error === 'object' && j.error !== null && 'message' in j.error
            ? String((j.error as { message?: string }).message ?? '')
            : '';
      if (inner.trim()) detail = inner.trim().slice(0, 400);
    } catch {
      /* keep detail as text slice */
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
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    return await handleOAuthCallbackGithub(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('oauth-callback-github unhandled:', msg);
    return jsonResponse({ error: `oauth-callback-github crashed: ${msg}` }, 500);
  }
});
