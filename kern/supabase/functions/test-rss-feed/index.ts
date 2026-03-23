import { getAuthenticatedUserId } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
    'i'
  );
  const m = xml.match(re);
  return m?.[1]?.trim() ?? '';
}

function extractFeedTitle(xml: string): string {
  if (/<feed[\s>]/i.test(xml)) {
    const m = xml.match(/<feed[^>]*>([\s\S]*?)<\/feed>/i);
    const feed = m?.[1] ?? xml;
    return getTag(feed, 'title') || 'Atom feed';
  }
  const cm = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channel = cm?.[1] ?? xml;
  return getTag(channel, 'title') || 'RSS feed';
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

  let body: { feed_url?: string };
  try {
    body = (await req.json()) as { feed_url?: string };
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const feedUrl = typeof body.feed_url === 'string' ? body.feed_url.trim() : '';
  if (!feedUrl) {
    return jsonResponse({ error: 'Missing feed_url' }, 400);
  }

  try {
    const u = new URL(feedUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return jsonResponse({ error: 'Only http(s) URLs allowed' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
  }

  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Kern-RSS-Test/1.0',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) {
      return jsonResponse({ error: `HTTP ${res.status} when fetching feed` }, 400);
    }
    const xml = await res.text();
    if (!/<rss|<feed/i.test(xml)) {
      return jsonResponse({ error: 'Response does not look like RSS or Atom XML' }, 400);
    }
    const title = extractFeedTitle(xml);
    return jsonResponse({ ok: true, title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 400);
  }
});
