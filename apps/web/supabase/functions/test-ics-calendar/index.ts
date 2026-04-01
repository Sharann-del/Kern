import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractCalendarTitle(ics: string): string {
  const m = ics.match(/^X-WR-CALNAME:(.+)$/m);
  return m?.[1]?.trim() ?? 'ICS Calendar';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body: { calendar_url?: string };
  try {
    body = (await req.json()) as { calendar_url?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const calendarUrl = typeof body.calendar_url === 'string' ? body.calendar_url.trim() : '';
  if (!calendarUrl) {
    return jsonResponse({ error: 'Missing calendar_url' }, 400);
  }

  try {
    const u = new URL(calendarUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'webcal:') {
      return jsonResponse({ error: 'Only http(s) or webcal URLs allowed' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
  }

  try {
    const fetchUrl = calendarUrl.replace(/^webcal:\/\//i, 'https://');
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Kern-ICS-Test/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
    });
    if (!res.ok) {
      return jsonResponse({ error: `HTTP ${res.status} when fetching calendar` }, 400);
    }
    const ics = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(ics)) {
      return jsonResponse({ error: 'Response does not look like an ICS calendar' }, 400);
    }
    const title = extractCalendarTitle(ics);
    return jsonResponse({ ok: true, title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as any)?.message || String(e);
    return jsonResponse({ error: msg }, 400);
  }
});
