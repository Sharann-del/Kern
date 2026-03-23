import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { encrypt } from '../_shared/crypto.ts';
import { extractDatabaseTitle } from '../_shared/notion-fields.ts';

const NOTION_VERSION = '2022-06-28';

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
};

function isAllowedNotionOAuthRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.pathname.replace(/\/$/, '') !== '/oauth/callback/notion') return false;
    if (u.protocol === 'https:') return true;
    if (u.protocol !== 'http:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function searchDatabases(accessToken: string): Promise<{ id: string; title: string }[]> {
  const out: { id: string; title: string }[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = {
      filter: { property: 'object', value: 'database' },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion search ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      results?: { object?: string; id?: string; title?: { plain_text?: string }[] }[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    for (const r of json.results ?? []) {
      if (r.object !== 'database' || !r.id) continue;
      out.push({ id: r.id, title: extractDatabaseTitle(r as { title?: { plain_text?: string }[] }) });
    }
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function handleOAuthCallbackNotion(req: Request): Promise<Response> {
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

  if (!code || !collectionId) {
    return jsonResponse({ error: 'Missing code or collection_id' }, 400);
  }

  if (!redirectUri) {
    return jsonResponse({ error: 'Missing redirect_uri' }, 400);
  }

  if (!isAllowedNotionOAuthRedirect(redirectUri)) {
    return jsonResponse({ error: 'Invalid redirect_uri' }, 400);
  }

  const requiredKeys = [
    'ENCRYPTION_KEY',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ] as const;
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
  const clientId = Deno.env.get('NOTION_CLIENT_ID')!;
  const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET')!;
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

  const basic = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    workspace_name?: string;
    bot_id?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg = tokenJson.error ?? 'Notion token exchange failed';
    return jsonResponse({ error: msg }, 400);
  }

  const encrypted = await encrypt(tokenJson.access_token, keyHex);

  const { error: updErr } = await supabase
    .from('collections')
    .update({
      is_live_source: true,
      live_source_type: 'notion_database',
      live_source_config: {
        access_token: encrypted,
        database_id: null,
        workspace_name: tokenJson.workspace_name ?? null,
        bot_id: tokenJson.bot_id ?? null,
      },
      sync_status: 'idle',
      sync_error_message: null,
    })
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (updErr) {
    return jsonResponse({ error: updErr.message ?? 'Failed to update collection' }, 500);
  }

  let databases: { id: string; title: string }[] = [];
  try {
    databases = await searchDatabases(tokenJson.access_token);
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
      })
      .eq('id', collectionId)
      .eq('user_id', userId);
    return jsonResponse({ error: `Could not list Notion databases: ${message}` }, 500);
  }

  return jsonResponse({
    success: true,
    collection_id: collectionId,
    databases,
    workspace_name: tokenJson.workspace_name ?? null,
  });
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
    return await handleOAuthCallbackNotion(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('oauth-callback-notion unhandled:', msg);
    return jsonResponse({ error: `oauth-callback-notion crashed: ${msg}` }, 500);
  }
});
