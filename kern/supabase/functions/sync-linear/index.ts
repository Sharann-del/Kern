import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt } from '../_shared/crypto.ts';
import {
  priorityOptionId,
  stateOptionId,
  upsertLinearFields,
} from '../_shared/linear-fields.ts';

const LINEAR_GQL = 'https://api.linear.app/graphql';

/**
 * Minimal issue shape — no nested `labels { nodes {…} }` (Linear counts that toward query complexity).
 * Omitting `includeArchived` / nested `teams { issues }` avoids "Query too complex" rejections.
 */
const ISSUE_CORE = `
  id
  title
  state { name }
  priority
  assignee { name }
  team { name }
  dueDate
  createdAt
  url
`;

function teamIdsQuery(): string {
  return `
query TeamIds($after: String) {
  teams(first: 25, after: $after) {
    nodes { id }
    pageInfo { hasNextPage endCursor }
  }
}
`;
}

function viewerTeamMembershipsQuery(): string {
  return `
query ViewerTeamMemberships($after: String) {
  viewer {
    teamMemberships(first: 25, after: $after) {
      nodes {
        team { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
`;
}

function viewerOrgTeamsQuery(): string {
  return `
query ViewerOrgTeams($after: String) {
  viewer {
    organization {
      teams(first: 25, after: $after) {
        nodes { id }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
`;
}

function viewerIssuesQuery(field: 'assignedIssues' | 'createdIssues', pageSize: number): string {
  return `
query Viewer${field === 'assignedIssues' ? 'Assigned' : 'Created'}($after: String) {
  viewer {
    ${field}(first: ${pageSize}, after: $after) {
      nodes { ${ISSUE_CORE} }
      pageInfo { hasNextPage endCursor }
    }
  }
}
`;
}

function issuesByTeamQuery(first: number): string {
  return `
query IssuesByTeam($teamId: ID!, $after: String) {
  issues(filter: { team: { id: { eq: $teamId } } }, first: ${first}, after: $after) {
    nodes { ${ISSUE_CORE} }
    pageInfo { hasNextPage endCursor }
  }
}
`;
}

function rootIssuesQuery(first: number): string {
  return `
query RootIssues($after: String) {
  issues(first: ${first}, after: $after) {
    nodes { ${ISSUE_CORE} }
    pageInfo { hasNextPage endCursor }
  }
}
`;
}

type RowInsert = {
  collection_id: string;
  user_id: string;
  external_id: string;
  data: Record<string, unknown>;
  sort_order: number;
};

type LinearIssueNode = {
  id: string;
  title: string;
  state?: { name?: string | null } | null;
  priority?: number | null;
  assignee?: { name?: string | null } | null;
  team?: { name?: string | null } | null;
  dueDate?: string | null;
  createdAt?: string | null;
  url?: string | null;
};

type IssueConnection = {
  nodes: LinearIssueNode[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function linearGql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_GQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message?: string }[] };
  if (!res.ok || json.errors?.length) {
    const msg = json.errors?.map((e) => e.message).join('; ') || `Linear HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!json.data) throw new Error('Linear: empty response');
  return json.data;
}

function isComplexityError(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('too complex') || m.includes('complexity') || m.includes('query cost');
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

function mapIssue(node: LinearIssueNode, userId: string, collectionId: string, sortOrder: number): RowInsert {
  const stateName = node.state?.name?.trim() ?? '';
  return {
    collection_id: collectionId,
    user_id: userId,
    external_id: node.id,
    data: {
      name: node.title,
      status: stateName ? stateOptionId(stateName) : null,
      priority: priorityOptionId(node.priority ?? null),
      assignee: node.assignee?.name?.trim() ?? null,
      team: node.team?.name?.trim() ?? null,
      labels: null,
      due_date: node.dueDate ?? null,
      url: node.url ?? null,
      created_at: node.createdAt ?? null,
      description: null,
    },
    sort_order: sortOrder,
  };
}

function mergeIssues(target: Map<string, LinearIssueNode>, nodes: LinearIssueNode[]): void {
  for (const n of nodes) {
    if (n?.id) target.set(n.id, n);
  }
}

async function fetchIssuesForTeam(
  token: string,
  teamId: string,
  pageSize: number
): Promise<LinearIssueNode[]> {
  const q = issuesByTeamQuery(pageSize);
  const out: LinearIssueNode[] = [];
  let after: string | undefined;
  for (;;) {
    const variables: Record<string, unknown> = { teamId };
    if (after) variables.after = after;
    const data = await linearGql<{ issues: IssueConnection }>(token, q, variables);
    const page = data.issues;
    out.push(...(page.nodes ?? []));
    if (!page.pageInfo?.hasNextPage) break;
    const next = page.pageInfo.endCursor;
    if (!next) break;
    after = next;
  }
  return out;
}

async function fetchRootIssues(token: string, pageSize: number): Promise<LinearIssueNode[]> {
  const q = rootIssuesQuery(pageSize);
  const byId = new Map<string, LinearIssueNode>();
  let after: string | undefined;
  for (;;) {
    const variables: Record<string, unknown> = {};
    if (after) variables.after = after;
    const data = await linearGql<{ issues: IssueConnection }>(token, q, variables);
    const page = data.issues;
    mergeIssues(byId, page.nodes ?? []);
    if (!page.pageInfo?.hasNextPage) break;
    const next = page.pageInfo.endCursor;
    if (!next) break;
    after = next;
  }
  return [...byId.values()];
}

/** OAuth tokens often see no data on root `teams` / `issues`; viewer + memberships is the reliable path. */
async function collectTeamIds(token: string): Promise<string[]> {
  const ids = new Set<string>();

  try {
    const teamsQ = teamIdsQuery();
    let teamsAfter: string | undefined;
    do {
      const tVars: Record<string, unknown> = {};
      if (teamsAfter) tVars.after = teamsAfter;
      const tData = await linearGql<{
        teams: {
          nodes: { id: string }[] | null;
          pageInfo: { hasNextPage: boolean; endCursor?: string | null };
        };
      }>(token, teamsQ, tVars);
      for (const n of tData.teams?.nodes ?? []) ids.add(n.id);
      if (!tData.teams?.pageInfo?.hasNextPage) break;
      const nextT = tData.teams.pageInfo.endCursor;
      if (!nextT) break;
      teamsAfter = nextT;
    } while (true);
  } catch {
    /* root teams may be empty or forbidden for some OAuth apps */
  }

  try {
    const q = viewerTeamMembershipsQuery();
    let after: string | undefined;
    do {
      const v: Record<string, unknown> = {};
      if (after) v.after = after;
      const d = await linearGql<{
        viewer: {
          teamMemberships: {
            nodes: { team: { id: string } | null }[] | null;
            pageInfo: { hasNextPage: boolean; endCursor?: string | null };
          } | null;
        };
      }>(token, q, v);
      for (const n of d.viewer?.teamMemberships?.nodes ?? []) {
        const tid = n?.team?.id;
        if (tid) ids.add(tid);
      }
      const pi = d.viewer?.teamMemberships?.pageInfo;
      if (!pi?.hasNextPage) break;
      if (!pi.endCursor) break;
      after = pi.endCursor;
    } while (true);
  } catch {
    /* schema differences */
  }

  try {
    const q = viewerOrgTeamsQuery();
    let after: string | undefined;
    do {
      const v: Record<string, unknown> = {};
      if (after) v.after = after;
      const d = await linearGql<{
        viewer: {
          organization: {
            teams: {
              nodes: { id: string }[] | null;
              pageInfo: { hasNextPage: boolean; endCursor?: string | null };
            } | null;
          } | null;
        };
      }>(token, q, v);
      const teams = d.viewer?.organization?.teams;
      for (const n of teams?.nodes ?? []) ids.add(n.id);
      if (!teams?.pageInfo?.hasNextPage) break;
      if (!teams.pageInfo.endCursor) break;
      after = teams.pageInfo.endCursor;
    } while (true);
  } catch {
    /* no org or different plan */
  }

  return [...ids];
}

async function fetchViewerIssueBranch(
  token: string,
  pageSize: number,
  field: 'assignedIssues' | 'createdIssues'
): Promise<LinearIssueNode[]> {
  const q = viewerIssuesQuery(field, pageSize);
  const out: LinearIssueNode[] = [];
  let after: string | undefined;
  for (;;) {
    const v: Record<string, unknown> = {};
    if (after) v.after = after;
    const d = await linearGql<{
      viewer: Record<string, IssueConnection | null | undefined>;
    }>(token, q, v);
    const conn = d.viewer[field];
    if (!conn) break;
    out.push(...(conn.nodes ?? []));
    if (!conn.pageInfo?.hasNextPage) break;
    const next = conn.pageInfo.endCursor;
    if (!next) break;
    after = next;
  }
  return out;
}

/**
 * Merge: per-team issues + viewer assigned/created + root issues fallback.
 * Each source is best-effort so one failure does not zero out the rest.
 */
async function fetchAllLinearIssues(token: string, pageSize: number): Promise<LinearIssueNode[]> {
  const byId = new Map<string, LinearIssueNode>();

  const teamIds = await collectTeamIds(token);
  for (const tid of teamIds) {
    try {
      mergeIssues(byId, await fetchIssuesForTeam(token, tid, pageSize));
    } catch {
      /* team-scoped query may fail for some tokens */
    }
  }

  try {
    mergeIssues(byId, await fetchViewerIssueBranch(token, pageSize, 'assignedIssues'));
  } catch {
    /* */
  }
  try {
    mergeIssues(byId, await fetchViewerIssueBranch(token, pageSize, 'createdIssues'));
  } catch {
    /* */
  }

  if (byId.size === 0) {
    try {
      mergeIssues(byId, await fetchRootIssues(token, pageSize));
    } catch {
      /* */
    }
  }

  return [...byId.values()];
}

async function fetchAllLinearIssuesWithRetry(token: string): Promise<LinearIssueNode[]> {
  const sizes = [100, 50, 25];
  let lastErr: Error | null = null;
  for (const pageSize of sizes) {
    try {
      return await fetchAllLinearIssues(token, pageSize);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (!isComplexityError(lastErr.message)) throw lastErr;
    }
  }
  throw lastErr ?? new Error('Linear: query complexity limit');
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
  if (!enc) throw new Error('Missing encrypted access_token in live_source_config');

  const accessToken = await decrypt(enc, keyHex);

  const { error: syncErr } = await supabase
    .from('collections')
    .update({ sync_status: 'syncing', sync_error_message: null })
    .eq('id', collection.id)
    .eq('user_id', userId);
  if (syncErr) throw syncErr;

  try {
    const issues = await fetchAllLinearIssuesWithRetry(accessToken);

    const stateNames = issues.map((i) => i.state?.name?.trim()).filter((x): x is string => Boolean(x));
    await upsertLinearFields(supabase, collection.id, userId, stateNames);

    const rows: RowInsert[] = issues.map((node, idx) => mapIssue(node, userId, collection.id, idx));
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
    return jsonResponse({ error: `Missing Edge Function secrets: ${missing.join(', ')}.` }, 500);
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
    .eq('live_source_type', 'linear_issues');

  if (singleId) {
    query = query.eq('id', singleId);
  }

  const { data: collections, error: listErr } = await query;
  if (listErr) {
    return jsonResponse({ error: listErr.message ?? 'Failed to list collections' }, 500);
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
    return await handleRequest(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('sync-linear unhandled:', msg);
    return jsonResponse({ error: `sync-linear crashed: ${msg}` }, 500);
  }
});
