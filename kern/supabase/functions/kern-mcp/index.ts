import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { handleMcpStreamablePost, type McpToolDef } from '../_shared/mcp-streamable.ts';

// Tool definitions — schemas from Kern PRD §19.3
const MCP_TOOLS = [
  {
    name: 'list_collections',
    description:
      "List all collections in the user's Kern workspace. Returns collection names, slugs, field schemas, row counts, and whether the collection is a live source.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_rows',
    description:
      'Query rows from a Kern collection. Supports filtering by field values and sorting. Returns row data with field values.',
    inputSchema: {
      type: 'object',
      required: ['collection_slug'],
      properties: {
        collection_slug: {
          type: 'string',
          description: 'The slug of the collection to query',
        },
        filters: {
          type: 'array',
          description: "Optional array of filter conditions (all AND'd together)",
          items: {
            type: 'object',
            required: ['field', 'operator', 'value'],
            properties: {
              field: { type: 'string', description: 'Field slug' },
              operator: {
                type: 'string',
                enum: ['eq', 'neq', 'gt', 'lt', 'contains', 'is_empty', 'is_not_empty'],
              },
              value: { description: 'Value to compare against' },
            },
          },
        },
        sort: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            direction: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
        limit: { type: 'number', default: 50, maximum: 200 },
        offset: { type: 'number', default: 0 },
      },
    },
  },
  {
    name: 'get_row',
    description: 'Get a single row by its ID, including all field values and related rows.',
    inputSchema: {
      type: 'object',
      required: ['row_id'],
      properties: {
        row_id: { type: 'string', description: 'UUID of the row' },
      },
    },
  },
  {
    name: 'create_row',
    description: 'Create a new row in a Kern collection with the specified field values.',
    inputSchema: {
      type: 'object',
      required: ['collection_slug', 'data'],
      properties: {
        collection_slug: { type: 'string' },
        data: {
          type: 'object',
          description:
            'Key-value pairs where keys are field slugs and values are field values. Use field slugs (snake_case) not display names.',
        },
      },
    },
  },
  {
    name: 'update_row',
    description: 'Update one or more field values on an existing row.',
    inputSchema: {
      type: 'object',
      required: ['row_id', 'data'],
      properties: {
        row_id: { type: 'string' },
        data: {
          type: 'object',
          description: 'Field slug → new value pairs. Only specified fields are updated.',
        },
      },
    },
  },
  {
    name: 'delete_row',
    description: 'Permanently delete a row by its ID.',
    inputSchema: {
      type: 'object',
      required: ['row_id'],
      properties: {
        row_id: { type: 'string' },
      },
    },
  },
  {
    name: 'create_collection',
    description: 'Create a new collection with a name, optional description, and optional initial fields.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string', description: 'An emoji character' },
        fields: {
          type: 'array',
          description: 'Optional fields to create alongside the collection',
          items: {
            type: 'object',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: [
                  'text',
                  'number',
                  'date',
                  'datetime',
                  'boolean',
                  'select',
                  'multi_select',
                  'url',
                  'email',
                  'rich_text',
                ],
              },
              options: { type: 'object' },
            },
          },
        },
      },
    },
  },
  {
    name: 'add_field',
    description: 'Add a new field to an existing collection.',
    inputSchema: {
      type: 'object',
      required: ['collection_slug', 'field_name', 'field_type'],
      properties: {
        collection_slug: { type: 'string' },
        field_name: { type: 'string' },
        field_type: {
          type: 'string',
          enum: [
            'text',
            'number',
            'date',
            'datetime',
            'boolean',
            'select',
            'multi_select',
            'url',
            'email',
            'phone',
            'rich_text',
          ],
        },
        options: {
          type: 'object',
          description: 'Type-specific options (e.g., items array for select fields)',
        },
      },
    },
  },
  {
    name: 'search_rows',
    description: 'Full-text search across all collections or within a specific collection.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search string' },
        collection_slug: { type: 'string', description: 'Optional: limit to one collection' },
        limit: { type: 'number', default: 20 },
      },
    },
  },
] as const;

type ToolError = { error: { code: string; message: string } };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string | null;
  is_live_source: boolean;
  sort_order: number;
  description?: string | null;
  color?: string | null;
  [key: string]: unknown;
};

async function getCollectionBySlug(
  supabase: SupabaseClient,
  userId: string,
  slug: string
): Promise<CollectionRow | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as CollectionRow | null;
}

async function nextUniqueCollectionSlug(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<string> {
  const base = slugify(name) || 'collection';
  const { data: rows, error } = await supabase.from('collections').select('slug').eq('user_id', userId);
  if (error) throw error;
  const taken = new Set((rows ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

async function nextUniqueFieldSlug(
  supabase: SupabaseClient,
  collectionId: string,
  name: string
): Promise<string> {
  const base = slugify(name) || 'field';
  const { data: rows, error } = await supabase.from('fields').select('slug').eq('collection_id', collectionId);
  if (error) throw error;
  const taken = new Set((rows ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

async function handleToolCall(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<unknown | ToolError> {
  switch (name) {
    case 'list_collections': {
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*, fields(*)')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      const list = collections ?? [];
      const out = await Promise.all(
        list.map(async (c: CollectionRow & { fields?: Record<string, unknown>[] }) => {
          const { count } = await supabase
            .from('rows')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('collection_id', c.id);
          const fields = [...(c.fields ?? [])].sort(
            (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
          );
          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            icon: c.icon,
            is_live_source: c.is_live_source,
            row_count: count ?? 0,
            fields,
          };
        })
      );
      return { collections: out };
    }

    case 'query_rows': {
      const collectionSlug = String(args.collection_slug ?? '');
      const col = await getCollectionBySlug(supabase, userId, collectionSlug);
      if (!col) return { error: { code: 'NOT_FOUND', message: 'Collection not found' } };

      const limit = Math.min(Math.max(1, Number(args.limit ?? 50) || 50), 200);
      const offset = Math.max(0, Number(args.offset ?? 0) || 0);
      const filters = (args.filters ?? []) as {
        field: string;
        operator: string;
        value?: unknown;
      }[];

      let q = supabase
        .from('rows')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('collection_id', col.id);

      for (const f of filters) {
        const colRef = `data->>'${f.field}'`;
        switch (f.operator) {
          case 'eq':
            q = q.eq(colRef, String(f.value));
            break;
          case 'neq':
            q = q.neq(colRef, String(f.value));
            break;
          case 'contains':
            q = q.ilike(colRef, `%${escapeIlike(String(f.value))}%`);
            break;
          case 'gt':
          case 'lt':
          case 'gte':
          case 'lte':
            q = q.filter(colRef, f.operator as 'gt' | 'lt' | 'gte' | 'lte', String(f.value));
            break;
          case 'is_empty':
            q = q.or(`${colRef}.is.null,${colRef}.eq.""`);
            break;
          case 'is_not_empty':
            q = q.not(colRef, 'is', null).neq(colRef, '');
            break;
          default:
            break;
        }
      }

      const sort = args.sort as { field?: string; direction?: string } | undefined;
      if (sort?.field) {
        q = q.order(`data->>'${sort.field}'`, {
          ascending: sort.direction !== 'desc',
        });
      } else {
        q = q.order('sort_order', { ascending: true });
      }

      q = q.range(offset, offset + limit - 1);

      const { data: rows, error, count } = await q;
      if (error) throw error;
      return { rows: rows ?? [], total_count: count ?? 0 };
    }

    case 'get_row': {
      const rowId = String(args.row_id ?? '');
      const { data: row, error } = await supabase
        .from('rows')
        .select('*')
        .eq('id', rowId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return { error: { code: 'UNAUTHORIZED', message: 'Row does not belong to user' } };
      return row;
    }

    case 'create_row': {
      const collectionSlug = String(args.collection_slug ?? '');
      const col = await getCollectionBySlug(supabase, userId, collectionSlug);
      if (!col) return { error: { code: 'NOT_FOUND', message: 'Collection not found' } };

      const data = (args.data && typeof args.data === 'object' ? args.data : {}) as Record<string, unknown>;
      const { data: maxRow } = await supabase
        .from('rows')
        .select('sort_order')
        .eq('user_id', userId)
        .eq('collection_id', col.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSort = (maxRow?.sort_order ?? -1) + 1;

      const { data: created, error } = await supabase
        .from('rows')
        .insert({
          collection_id: col.id,
          user_id: userId,
          data,
          sort_order: nextSort,
        })
        .select('*')
        .single();
      if (error) throw error;
      return created;
    }

    case 'update_row': {
      const rowId = String(args.row_id ?? '');
      const { data: existing, error: fetchErr } = await supabase
        .from('rows')
        .select('*')
        .eq('id', rowId)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing) return { error: { code: 'UNAUTHORIZED', message: 'Row does not belong to user' } };

      const patch = (args.data && typeof args.data === 'object' ? args.data : {}) as Record<string, unknown>;
      const prevData =
        existing.data && typeof existing.data === 'object' && !Array.isArray(existing.data)
          ? (existing.data as Record<string, unknown>)
          : {};
      const merged = { ...prevData, ...patch };

      const { data: updated, error } = await supabase
        .from('rows')
        .update({ data: merged })
        .eq('id', rowId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return updated;
    }

    case 'delete_row': {
      const rowId = String(args.row_id ?? '');
      const { data: existing, error: fetchErr } = await supabase
        .from('rows')
        .select('id')
        .eq('id', rowId)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!existing) return { error: { code: 'UNAUTHORIZED', message: 'Row does not belong to user' } };

      const { error } = await supabase.from('rows').delete().eq('id', rowId).eq('user_id', userId);
      if (error) throw error;
      return { deleted: true, row_id: rowId };
    }

    case 'create_collection': {
      const collectionName = String(args.name ?? '').trim();
      if (!collectionName) return { error: { code: 'INTERNAL_ERROR', message: 'Collection name is required' } };

      const slug = await nextUniqueCollectionSlug(supabase, userId, collectionName);
      const { data: maxRow } = await supabase
        .from('collections')
        .select('sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSort = (maxRow?.sort_order ?? -1) + 1;

      const { data: collection, error: cErr } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: collectionName,
          slug,
          description: typeof args.description === 'string' ? args.description : null,
          icon: typeof args.icon === 'string' ? args.icon : null,
          is_live_source: false,
          sort_order: nextSort,
        })
        .select('*')
        .single();
      if (cErr) throw cErr;

      const fieldRows: Record<string, unknown>[] = [];
      const { error: primaryErr } = await supabase.from('fields').insert({
        collection_id: collection.id,
        user_id: userId,
        name: 'Name',
        slug: 'name',
        type: 'text',
        is_primary: true,
        sort_order: 0,
      });
      if (primaryErr) throw primaryErr;

      const { data: primaryField } = await supabase
        .from('fields')
        .select('*')
        .eq('collection_id', collection.id)
        .eq('slug', 'name')
        .single();
      if (primaryField) fieldRows.push(primaryField);

      const extra = (Array.isArray(args.fields) ? args.fields : []) as {
        name: string;
        type: string;
        options?: unknown;
      }[];
      let sortOrder = 1;
      for (const ef of extra) {
        const fname = String(ef.name ?? '').trim();
        if (!fname) continue;
        const fslug = await nextUniqueFieldSlug(supabase, collection.id, fname);
        const { data: nf, error: fErr } = await supabase
          .from('fields')
          .insert({
            collection_id: collection.id,
            user_id: userId,
            name: fname,
            slug: fslug,
            type: ef.type,
            options: ef.options && typeof ef.options === 'object' ? ef.options : null,
            is_primary: false,
            sort_order: sortOrder++,
          })
          .select('*')
          .single();
        if (fErr) throw fErr;
        if (nf) fieldRows.push(nf);
      }

      return { collection, fields: fieldRows };
    }

    case 'add_field': {
      const collectionSlug = String(args.collection_slug ?? '');
      const col = await getCollectionBySlug(supabase, userId, collectionSlug);
      if (!col) return { error: { code: 'NOT_FOUND', message: 'Collection not found' } };

      const fieldName = String(args.field_name ?? '').trim();
      if (!fieldName) return { error: { code: 'INTERNAL_ERROR', message: 'field_name is required' } };
      const fieldType = String(args.field_type ?? 'text');

      const { data: fields, error: fListErr } = await supabase
        .from('fields')
        .select('sort_order')
        .eq('user_id', userId)
        .eq('collection_id', col.id);
      if (fListErr) throw fListErr;
      const maxSo = Math.max(0, ...(fields ?? []).map((r: { sort_order: number }) => r.sort_order));
      const fslug = await nextUniqueFieldSlug(supabase, col.id, fieldName);

      const { data: created, error } = await supabase
        .from('fields')
        .insert({
          collection_id: col.id,
          user_id: userId,
          name: fieldName,
          slug: fslug,
          type: fieldType,
          options: args.options && typeof args.options === 'object' ? args.options : null,
          is_primary: false,
          sort_order: maxSo + 1,
        })
        .select('*')
        .single();
      if (error) throw error;
      return created;
    }

    case 'search_rows': {
      const query = String(args.query ?? '');
      const lim = Math.min(Math.max(1, Number(args.limit ?? 20) || 20), 200);
      if (!query.trim()) return { rows: [], matching_collections: [] };

      let q = supabase
        .from('rows')
        .select('*')
        .eq('user_id', userId)
        .ilike('data::text', `%${escapeIlike(query)}%`)
        .limit(lim);

      if (typeof args.collection_slug === 'string' && args.collection_slug) {
        const col = await getCollectionBySlug(supabase, userId, args.collection_slug);
        if (!col) return { error: { code: 'NOT_FOUND', message: 'Collection not found' } };
        q = q.eq('collection_id', col.id);
      }

      const { data: rows, error } = await q;
      if (error) throw error;
      const rowList = rows ?? [];
      const collIds = [...new Set(rowList.map((r: { collection_id: string }) => r.collection_id))];
      let matching_collections: { id: string; name: string; slug: string }[] = [];
      if (collIds.length > 0) {
        const { data: cols, error: cErr } = await supabase
          .from('collections')
          .select('id, name, slug')
          .eq('user_id', userId)
          .in('id', collIds);
        if (cErr) throw cErr;
        matching_collections = cols ?? [];
      }
      return { rows: rowList, matching_collections };
    }

    default:
      return { error: { code: 'NOT_FOUND', message: 'Unknown tool' } };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      },
    });
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    return new Response(null, {
      status: 405,
      headers: {
        ...corsHeaders,
        Allow: 'POST, GET, DELETE, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: { code: 'INVALID_REQUEST', message: 'Method not allowed' } }, 405);
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: { code: 'INVALID_REQUEST', message: 'Invalid JSON body' } }, 400);
  }

  const createServiceClient = () => {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      throw new Error('Server misconfiguration: missing SERVICE_ROLE_KEY');
    }
    return createClient(url, serviceKey);
  };

  const streamRes = await handleMcpStreamablePost({
    req,
    body,
    userId,
    mcpTools: MCP_TOOLS.map((t) => ({ ...t })) as McpToolDef[],
    handleToolCall,
    createServiceClient,
  });
  if (streamRes) return streamRes;

  const wrap = (payload: Record<string, unknown>) => {
    const out: Record<string, unknown> = { ...payload };
    if ('id' in body) out.id = body.id;
    if (typeof body.jsonrpc === 'string') out.jsonrpc = body.jsonrpc;
    return out;
  };

  const method = body.method;
  if (method === 'tools/list') {
    return jsonResponse(wrap({ result: { tools: [...MCP_TOOLS] } }));
  }

  if (method === 'tools/call') {
    const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const toolName = params.name;
    if (!toolName || typeof toolName !== 'string') {
      return jsonResponse(wrap({ error: { code: 'INVALID_REQUEST', message: 'Missing tool name' } }), 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) {
      return jsonResponse(
        wrap({ result: { error: { code: 'INTERNAL_ERROR', message: 'Server misconfiguration' } } }),
        500
      );
    }

    const supabase = createClient(url, serviceKey);

    try {
      const toolArgs = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
      const toolResult = await handleToolCall(supabase, userId, toolName, toolArgs);
      return jsonResponse(wrap({ result: toolResult }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse(wrap({ result: { error: { code: 'INTERNAL_ERROR', message } } }));
    }
  }

  return jsonResponse(wrap({ error: { code: 'INVALID_REQUEST', message: 'Unknown method' } }), 400);
});
