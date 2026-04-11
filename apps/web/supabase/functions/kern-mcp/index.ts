import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3'
import { getAuthenticatedUserId } from '../_shared/auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleMcpStreamablePost, type McpToolDef } from '../_shared/mcp-streamable.ts'

const MCP_TOOLS = [
  {
    name: 'list_collections',
    description: "List all collections in the user's workspace",
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'query_rows',
    description: 'Query rows from a collection',
    inputSchema: {
      type: 'object',
      required: ['collection_slug'],
      properties: {
        collection_slug: { type: 'string' },
        limit: { type: 'number', default: 50 }
      }
    }
  }
] as const

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleToolCall(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, unknown>
) {
  switch (name) {
    case 'list_collections': {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return { collections: data ?? [] }
    }

    case 'query_rows': {
      const slug = String(args.collection_slug ?? '')

      const { data: collection } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .eq('slug', slug)
        .single()

      if (!collection) {
        return { error: { code: 'NOT_FOUND', message: 'Collection not found' } }
      }

      const { data, error } = await supabase
        .from('rows')
        .select('*')
        .eq('collection_id', collection.id)
        .eq('user_id', userId)
        .limit(Number(args.limit ?? 50))

      if (error) throw error
      return { rows: data ?? [] }
    }

    default:
      return { error: { code: 'NOT_FOUND', message: 'Unknown tool' } }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    if (body.jsonrpc === '2.0') {
      const id = Object.prototype.hasOwnProperty.call(body, 'id') ? body.id : null
      return jsonResponse(
        {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32_001,
            message:
              'Unauthorized: send Authorization: Bearer <access token> and apikey (Supabase anon) headers.',
          },
        },
        401
      )
    }
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const createServiceClient = () => {
    const url = Deno.env.get('SUPABASE_URL')!
    const key =
      Deno.env.get('SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    return createClient(url, key)
  }

  const streamRes = await handleMcpStreamablePost({
    req,
    body,
    userId,
    mcpTools: MCP_TOOLS as unknown as McpToolDef[],
    handleToolCall,
    createServiceClient
  })

  if (streamRes) return streamRes

  const method = body.method

  if (method === 'tools/list') {
    return jsonResponse({
      jsonrpc: '2.0',
      id: body.id,
      result: { tools: MCP_TOOLS }
    })
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = body.params as any

    const supabase = createServiceClient()

    try {
      const result = await handleToolCall(
        supabase,
        userId,
        name,
        args || {}
      )

      return jsonResponse({
        jsonrpc: '2.0',
        id: body.id,
        result
      })
    } catch (e) {
      return jsonResponse({
        jsonrpc: '2.0',
        id: body.id,
        error: { message: e instanceof Error ? e.message : String(e) }
      })
    }
  }

  return jsonResponse({ error: 'Unknown method' }, 400)
})