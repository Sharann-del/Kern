import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt } from '../_shared/crypto.ts';

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

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Kern-Live-Source/1.0',
  };
}

async function githubJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

async function fetchAllPages<T>(buildUrl: (page: number) => string, token: string, maxPages = 40): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const chunk = await githubJson<T[]>(buildUrl(page), token);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    out.push(...chunk);
    if (chunk.length < 100) break;
  }
  return out;
}

type GitHubPull = {
  node_id: string;
  title: string;
  state: string;
  merged_at: string | null;
  base: { ref: string; repo: { full_name: string } };
  head: { ref: string };
  user: { login: string } | null;
  html_url: string;
  number: number;
  created_at: string;
};

function mapPr(pr: GitHubPull, userId: string, collectionId: string): RowInsert {
  return {
    collection_id: collectionId,
    user_id: userId,
    external_id: pr.node_id,
    data: {
      name: pr.title,
      status: pr.merged_at ? 'merged' : pr.state,
      repo: pr.base.repo.full_name,
      branch: pr.head.ref,
      author: pr.user?.login ?? '',
      url: pr.html_url,
      pr_number: String(pr.number),
      created_at: pr.created_at,
      merged_at: pr.merged_at ?? null,
    },
    sort_order: 0,
  };
}

type GitHubIssue = {
  node_id: string;
  title: string;
  state: string;
  html_url: string;
  number: number;
  created_at: string;
  closed_at: string | null;
  pull_request?: unknown;
  user: { login: string } | null;
  repository?: { full_name: string };
};

function mapIssue(issue: GitHubIssue, userId: string, collectionId: string): RowInsert {
  return {
    collection_id: collectionId,
    user_id: userId,
    external_id: issue.node_id,
    data: {
      name: issue.title,
      state: issue.state,
      repo: issue.repository?.full_name ?? '',
      author: issue.user?.login ?? '',
      url: issue.html_url,
      issue_number: String(issue.number),
      created_at: issue.created_at,
      closed_at: issue.closed_at ?? null,
    },
    sort_order: 0,
  };
}

type GitHubRepo = {
  node_id: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
};

function mapRepo(repo: GitHubRepo, userId: string, collectionId: string): RowInsert {
  return {
    collection_id: collectionId,
    user_id: userId,
    external_id: repo.node_id,
    data: {
      name: repo.full_name,
      description: repo.description ?? '',
      is_private: repo.private,
      default_branch: repo.default_branch,
      url: repo.html_url,
      stars: repo.stargazers_count,
      updated_at: repo.updated_at,
    },
    sort_order: 0,
  };
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

async function syncCollection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  collection: {
    id: string;
    user_id: string;
    live_source_type: string | null;
    live_source_config: Record<string, unknown> | null;
  },
  keyHex: string
): Promise<void> {
  const t = collection.live_source_type ?? '';
  if (!t.startsWith('github_')) return;

  const cfg = collection.live_source_config;
  const enc = cfg && typeof cfg.access_token === 'string' ? cfg.access_token : null;
  if (!enc) throw new Error('Missing encrypted access_token in live_source_config');

  const accessToken = await decrypt(enc, keyHex);
  const repoFilterRaw = cfg && typeof cfg.repo_filter === 'string' ? cfg.repo_filter.trim() : '';
  const repoFilter = repoFilterRaw || null;

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    let rows: RowInsert[] = [];

    if (t === 'github_prs') {
      type RepoListItem = { full_name: string; name: string; owner: { login: string } };
      let repos = await fetchAllPages<RepoListItem>(
        (p) => `https://api.github.com/user/repos?per_page=100&page=${p}&sort=updated`,
        accessToken
      );
      if (repoFilter) {
        const f = repoFilter.toLowerCase();
        repos = repos.filter((r) => r.full_name.toLowerCase() === f);
      }
      for (const repo of repos) {
        const pulls = await fetchAllPages<GitHubPull>(
          (p) =>
            `https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls?state=all&per_page=100&page=${p}`,
          accessToken
        );
        for (const pr of pulls) {
          rows.push(mapPr(pr, userId, collection.id));
        }
      }
    } else if (t === 'github_issues') {
      const issues = await fetchAllPages<GitHubIssue>(
        (p) => `https://api.github.com/issues?state=all&per_page=100&page=${p}`,
        accessToken
      );
      let filtered = issues.filter((i) => !('pull_request' in i));
      if (repoFilter) {
        const f = repoFilter.toLowerCase();
        filtered = filtered.filter((i) => (i.repository?.full_name ?? '').toLowerCase() === f);
      }
      rows = filtered.map((i) => mapIssue(i, userId, collection.id));
    } else if (t === 'github_repos') {
      let repos = await fetchAllPages<GitHubRepo>(
        (p) => `https://api.github.com/user/repos?per_page=100&page=${p}&sort=updated`,
        accessToken
      );
      if (repoFilter) {
        const f = repoFilter.toLowerCase();
        repos = repos.filter((r) => r.full_name.toLowerCase() === f);
      }
      rows = repos.map((r) => mapRepo(r, userId, collection.id));
    } else {
      throw new Error(`Unsupported live_source_type: ${t}`);
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

async function handleSyncGithubRequest(req: Request): Promise<Response> {
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
        error: `Missing Edge Function secrets: ${missing.join(', ')}. Set ENCRYPTION_KEY (64 hex chars) in Dashboard → Edge Functions → Secrets.`,
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
    .select('id, user_id, live_source_type, live_source_config')
    .eq('user_id', userId)
    .like('live_source_type', 'github_%');

  if (singleId) {
    query = query.eq('id', singleId);
  }

  const { data: collections, error: listErr } = await query;
  if (listErr) {
    const msg =
      typeof listErr.message === 'string' && listErr.message.trim()
        ? listErr.message.trim()
        : 'Failed to list collections';
    return jsonResponse({ error: msg }, 500);
  }

  const list = collections ?? [];
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
    return await handleSyncGithubRequest(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sync-github unhandled:', msg);
    return jsonResponse({ error: `sync-github crashed: ${msg}` }, 500);
  }
});
