/** Extra context when Supabase `functions.invoke` fails at the network/fetch layer. */
export function edgeFunctionInvokeHint(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const origin = url && url.length > 0 ? url : '(VITE_SUPABASE_URL not set)';
  return `Could not reach Edge Functions at ${origin}/functions/v1/…

Local Supabase: in a separate terminal, from the kern/ folder run:
  supabase functions serve --env-file .env.local
(Use an env file with SUPABASE_URL, SUPABASE_ANON_KEY, ENCRYPTION_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.)

Hosted Supabase: deploy the functions:
  supabase functions deploy sync-github
  supabase functions deploy oauth-callback-github
(Set the same secrets in the project dashboard or via supabase secrets set.)`;
}

export function isLikelyEdgeFunctionTransportError(message: string): boolean {
  return /failed to send|fetch|network|load failed|connection refused/i.test(message);
}

/** Use on full-page error text (OAuth callback, etc.). */
export function appendEdgeFunctionHintForDisplay(message: string): string {
  if (isLikelyEdgeFunctionTransportError(message)) {
    return `${message}\n\n${edgeFunctionInvokeHint()}`;
  }
  return message;
}
