import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Resolves a stored file reference to a URL the browser can load.
 * Supports full https URLs and `bucket/path` references (signed URL).
 */
export function useFileUrl(stored: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!stored?.trim()) {
      setUrl(null);
      return;
    }
    const s = stored.trim();
    if (/^https?:\/\//i.test(s)) {
      setUrl(s);
      return;
    }
    const i = s.indexOf('/');
    if (i <= 0 || i >= s.length - 1) {
      setUrl(null);
      return;
    }
    const bucket = s.slice(0, i);
    const path = s.slice(i + 1);
    let cancelled = false;
    void supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        setUrl(error ? null : (data?.signedUrl ?? null));
      });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return url;
}
