/**
 * Local MCP server (stdio) that proxies tool calls to Kern's Supabase Edge Function.
 * Use this with Cursor / Claude Desktop instead of `npx mcp-remote <url>` (incompatible protocol).
 *
 * Required env:
 *   KERN_MCP_URL              — e.g. https://<ref>.supabase.co/functions/v1/kern-mcp
 *   KERN_SUPABASE_ANON_KEY    — project anon key
 *   KERN_ACCESS_TOKEN       — Supabase user access_token (refresh in Settings → Generate token when it expires)
 *
 * Logs must go to stderr only; stdout is reserved for MCP JSON-RPC.
 */
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const url = (process.env.KERN_MCP_URL ?? '').trim();
const anon = (process.env.KERN_SUPABASE_ANON_KEY ?? '').trim();
const token = (process.env.KERN_ACCESS_TOKEN ?? '').trim();

if (!url || !anon || !token) {
  console.error(
    'kern-mcp-bridge: set KERN_MCP_URL, KERN_SUPABASE_ANON_KEY, and KERN_ACCESS_TOKEN in the MCP server env block.'
  );
  process.exit(1);
}

async function kernToolsCall(name, args) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
    body: JSON.stringify({
      method: 'tools/call',
      params: { name, arguments: args ?? {} },
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Kern MCP: HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  if (!res.ok) {
    throw new Error(`Kern MCP: HTTP ${res.status} — ${text.slice(0, 400)}`);
  }
  const result = json.result;
  if (result && typeof result === 'object' && 'error' in result) {
    const e = result.error;
    const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(result.error);
    throw new Error(msg);
  }
  return result;
}

function textResult(data) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({ name: 'kern-mcp-bridge', version: '1.0.0' });

server.registerTool(
  'list_collections',
  {
    description:
      "List all collections in the user's Kern workspace (names, slugs, fields, row counts).",
    inputSchema: z.object({}),
  },
  async () => textResult(await kernToolsCall('list_collections', {}))
);

server.registerTool(
  'query_rows',
  {
    description: 'Query rows from a Kern collection with optional filters and sort.',
    inputSchema: z.object({
      collection_slug: z.string(),
      filters: z
        .array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.any().optional(),
          })
        )
        .optional(),
      sort: z
        .object({
          field: z.string(),
          direction: z.enum(['asc', 'desc']).optional(),
        })
        .optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
  },
  async (args) => textResult(await kernToolsCall('query_rows', args))
);

server.registerTool(
  'get_row',
  {
    description: 'Get a single row by UUID.',
    inputSchema: z.object({ row_id: z.string() }),
  },
  async (args) => textResult(await kernToolsCall('get_row', args))
);

server.registerTool(
  'create_row',
  {
    description: 'Create a row in a collection; data keys are field slugs.',
    inputSchema: z.object({
      collection_slug: z.string(),
      data: z.record(z.string(), z.any()),
    }),
  },
  async (args) => textResult(await kernToolsCall('create_row', args))
);

server.registerTool(
  'update_row',
  {
    description: 'Merge new field values into an existing row.',
    inputSchema: z.object({
      row_id: z.string(),
      data: z.record(z.string(), z.any()),
    }),
  },
  async (args) => textResult(await kernToolsCall('update_row', args))
);

server.registerTool(
  'delete_row',
  {
    description: 'Delete a row by UUID.',
    inputSchema: z.object({ row_id: z.string() }),
  },
  async (args) => textResult(await kernToolsCall('delete_row', args))
);

server.registerTool(
  'create_collection',
  {
    description: 'Create a collection with optional description, icon, and extra fields.',
    inputSchema: z.object({
      name: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
      fields: z.array(z.any()).optional(),
    }),
  },
  async (args) => textResult(await kernToolsCall('create_collection', args))
);

server.registerTool(
  'add_field',
  {
    description: 'Add a field to a collection.',
    inputSchema: z.object({
      collection_slug: z.string(),
      field_name: z.string(),
      field_type: z.string(),
      options: z.record(z.string(), z.any()).optional(),
    }),
  },
  async (args) => textResult(await kernToolsCall('add_field', args))
);

server.registerTool(
  'search_rows',
  {
    description: 'Search row JSON across collections or one collection.',
    inputSchema: z.object({
      query: z.string(),
      collection_slug: z.string().optional(),
      limit: z.number().optional(),
    }),
  },
  async (args) => textResult(await kernToolsCall('search_rows', args))
);

const transport = new StdioServerTransport();
await server.connect(transport);

// Dev hint only
if (process.env.KERN_MCP_BRIDGE_DEBUG === '1') {
  const here = fileURLToPath(import.meta.url);
  console.error(`kern-mcp-bridge: ready (stdio) — ${here}`);
}
