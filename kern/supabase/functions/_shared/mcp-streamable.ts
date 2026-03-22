/**
 * MCP Streamable HTTP (2025-11-25) — JSON-RPC over POST.
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

import { corsHeaders } from './cors.ts';

const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
]);

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

function mergeHeaders(init: HeadersInit): Headers {
  const h = new Headers(corsHeaders);
  if (init instanceof Headers) {
    init.forEach((v, k) => h.set(k, v));
  } else if (Array.isArray(init)) {
    for (const [k, v] of init) h.set(k, v);
  } else if (init) {
    for (const [k, v] of Object.entries(init)) {
      if (v !== undefined) h.set(k, v);
    }
  }
  return h;
}

function isAllowedOrigin(req: Request): boolean {
  const o = req.headers.get('Origin');
  if (!o || o === 'null') return true;
  try {
    const { hostname } = new URL(o);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'claude.ai' || hostname.endsWith('.claude.ai')) return true;
    if (hostname === 'anthropic.com' || hostname.endsWith('.anthropic.com')) return true;
    return false;
  } catch {
    return false;
  }
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  const headers = mergeHeaders({
    'Content-Type': 'application/json',
    ...extraHeaders,
  });
  return new Response(JSON.stringify(body), { status, headers });
}

function acceptedResponse(): Response {
  return new Response(null, { status: 202, headers: mergeHeaders({}) });
}

export async function handleMcpStreamablePost(opts: {
  req: Request;
  body: Record<string, unknown>;
  userId: string;
  mcpTools: McpToolDef[];
  handleToolCall: (
    supabase: SupabaseClient,
    userId: string,
    name: string,
    args: Record<string, unknown>
  ) => Promise<unknown | { error: { code: string; message: string } }>;
  createServiceClient: () => SupabaseClient;
}): Promise<Response | null> {
  if (opts.body.jsonrpc !== '2.0') return null;

  if (!isAllowedOrigin(opts.req)) {
    return jsonResponse(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Origin' } },
      403
    );
  }

  const method = opts.body.method;
  if (typeof method !== 'string') {
    const id = 'id' in opts.body ? opts.body.id : null;
    return jsonResponse(
      { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } },
      400
    );
  }

  const hasId = Object.prototype.hasOwnProperty.call(opts.body, 'id');
  const id = hasId ? opts.body.id : undefined;

  if (method.startsWith('notifications/')) {
    return acceptedResponse();
  }

  if (!hasId) {
    return acceptedResponse();
  }

  if (method === 'initialize') {
    const params = (opts.body.params ?? {}) as { protocolVersion?: string };
    const requested = params.protocolVersion ?? '2025-11-25';
    const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : '2025-03-26';
    return jsonResponse({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'kern-mcp', version: '1.0.0' },
      },
    });
  }

  if (method === 'ping') {
    return jsonResponse({ jsonrpc: '2.0', id, result: {} });
  }

  if (method === 'tools/list') {
    return jsonResponse({
      jsonrpc: '2.0',
      id,
      result: { tools: opts.mcpTools.map((t) => ({ ...t })) },
    });
  }

  if (method === 'tools/call') {
    const params = (opts.body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const toolName = params.name;
    if (!toolName || typeof toolName !== 'string') {
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Missing tool name' },
      });
    }
    const toolArgs = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};
    const supabase = opts.createServiceClient();
    try {
      const out = await opts.handleToolCall(supabase, opts.userId, toolName, toolArgs);
      if (out && typeof out === 'object' && 'error' in out) {
        const e = (out as { error: { message?: string } }).error;
        const text = typeof e?.message === 'string' ? e.message : JSON.stringify(out);
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text }],
            isError: true,
          },
        });
      }
      const text = typeof out === 'string' ? out : JSON.stringify(out, null, 2);
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text }],
          isError: false,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: message }],
          isError: true,
        },
      });
    }
  }

  return jsonResponse({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}
