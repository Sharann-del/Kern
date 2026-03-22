import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [message] = useState('Processing...');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await supabase.auth.getSession();
      if (!cancelled) {
        navigate('/dashboard', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-kern-bg">
      <p className="text-sm text-kern-text-2">{message}</p>
    </div>
  );
}
