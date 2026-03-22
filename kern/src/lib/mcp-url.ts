/** Cloud project ref from `https://{ref}.supabase.co`; local dev falls back to same-origin functions URL. */
export function getMcpServerUrl(): string | null {
  const raw = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (host.endsWith('.supabase.co')) {
      const ref = host.replace(/\.supabase\.co$/i, '');
      if (!ref) return null;
      return `https://${ref}.supabase.co/functions/v1/kern-mcp`;
    }
    return `${u.origin}/functions/v1/kern-mcp`;
  } catch {
    return null;
  }
}
