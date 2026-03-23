import type { FunctionsInvokeResult } from '@/lib/functions-invoke';
import { supabase } from '@/lib/supabase';

/**
 * Invoke an Edge Function with the current session access token.
 * Avoids occasional Kong "Invalid JWT" when the client’s default header is stale;
 * auth is still validated inside the function.
 */
export async function invokeAuthedEdgeFunction<T>(
  name: string,
  init?: { body?: Record<string, unknown> }
): Promise<FunctionsInvokeResult<T>> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return { data: null, error: new Error(sessionError.message), response: undefined };
  }
  if (!session?.access_token) {
    return { data: null, error: new Error('Not signed in'), response: undefined };
  }

  return (await supabase.functions.invoke(name, {
    body: init?.body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })) as FunctionsInvokeResult<T>;
}
