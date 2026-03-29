import { appendEdgeFunctionHintForDisplay, isLikelyEdgeFunctionTransportError } from '@/lib/edge-function-help';

/** Return value from `supabase.functions.invoke` (third field is omitted from some typings). */
export type FunctionsInvokeResult<T> = {
  data: T | null;
  error: Error | null;
  response?: Response;
};

function responseFromError(error: unknown): Response | undefined {
  if (error && typeof error === 'object' && 'context' in error) {
    const c = (error as { context: unknown }).context;
    if (c instanceof Response) return c;
  }
  return undefined;
}

function looksLikeUuidOnly(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

/** Plain-text bodies from the platform when the worker crashes (not valid JSON). */
function sanitizeNonJsonErrorBody(text: string): string {
  const t = text.trim();
  if (t.includes('[object Object]')) {
    const m = t.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const ref = m ? m[1] : null;
    return ref
      ? `Edge runtime error (ref ${ref}). The function crashed or returned a non-JSON response — open Supabase Dashboard → Edge Functions → sync-github (or oauth-callback-github) → Logs for the stack trace. Rows only load after a successful sync.`
      : 'Edge runtime returned an invalid error body. Check Edge Functions → Logs. Rows only load after sync succeeds.';
  }
  return t;
}

/** PostgREST / Edge payloads often use string or nested `{ message }` for `error`. */
function pickHumanReadableErrorFromJsonValue(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.error_description === 'string' && o.error_description.trim()) return o.error_description.trim();
    if (typeof o.details === 'string' && o.details.trim()) return o.details.trim();
    try {
      const s = JSON.stringify(v);
      if (s.length > 0 && s.length <= 800) return s;
      return `${s.slice(0, 400)}…`;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function pickErrorTextFromParsedBody(j: Record<string, unknown>): string | undefined {
  const fromErr = pickHumanReadableErrorFromJsonValue(j.error);
  const fromMsg = pickHumanReadableErrorFromJsonValue(j.message);
  const fromDetailStr =
    (typeof j.detail === 'string' && j.detail.trim() ? j.detail.trim() : undefined) ??
    (typeof j.details === 'string' && j.details.trim() ? j.details.trim() : undefined);
  const fromDetailsObj = pickHumanReadableErrorFromJsonValue(j.details);

  if (fromErr && looksLikeUuidOnly(fromErr) && (fromMsg || fromDetailStr || fromDetailsObj)) {
    return fromMsg ?? fromDetailStr ?? fromDetailsObj;
  }

  return fromErr ?? fromMsg ?? fromDetailStr ?? fromDetailsObj;
}

/**
 * Turn generic "non-2xx" into the JSON `error` / body text from the Edge Function when possible.
 */
export async function describeFunctionsInvokeError(
  error: unknown,
  response?: Response | null
): Promise<string> {
  const res = response ?? responseFromError(error) ?? null;
  const base = error instanceof Error ? error.message : String(error);

  if (!res) {
    return appendEdgeFunctionHintForDisplay(base);
  }

  const status = res.status;
  let bodyDetail = '';

  try {
    const text = await res.text();
    if (text) {
      try {
        const j = JSON.parse(text) as Record<string, unknown>;
        const part = pickErrorTextFromParsedBody(j);
        if (part) bodyDetail = part;
        else if (text.length < 500) bodyDetail = sanitizeNonJsonErrorBody(text);
      } catch {
        bodyDetail = sanitizeNonJsonErrorBody(text);
        if (bodyDetail.length > 600) bodyDetail = `${bodyDetail.slice(0, 600)}…`;
      }
    }
  } catch {
    /* ignore */
  }

  let out = bodyDetail ? `${base} (HTTP ${status}): ${bodyDetail}` : `${base} (HTTP ${status})`;

  if (status === 401) {
    out += '\n\nThe function rejected your session. Sign out and sign in again, then retry.';
  } else if (status === 404) {
    out +=
      '\n\nThat function name is not deployed on this project. Deploy: sync-github, oauth-callback-github, sync-google-calendar, oauth-callback-google, sync-rss, test-rss-feed.';
  } else if (status >= 500) {
    out +=
      '\n\nCheck Dashboard → Edge Functions → Logs. Common fixes: set secrets ENCRYPTION_KEY (64 hex), GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET; verify GitHub OAuth callback URL matches this app.';
  }

  if (isLikelyEdgeFunctionTransportError(out)) {
    return appendEdgeFunctionHintForDisplay(out);
  }
  return out;
}
