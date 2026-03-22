import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.3';

export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const url = Deno.env.get('SUPABASE_URL');
  // Validate the user JWT with the anon key (injected on hosted Edge Functions). Do not require
  // SERVICE_ROLE_KEY here — that is only for DB calls in tools/call.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return null;
  }

  const supabase = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}
