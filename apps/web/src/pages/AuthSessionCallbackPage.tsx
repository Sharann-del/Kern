import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { supabase } from '@/lib/supabase';

/**
 * Landing page after Supabase Auth OAuth (e.g. Google, GitHub).
 * URL may contain tokens or a PKCE code; the client exchanges them on load.
 */
export function AuthSessionCallbackPage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let finished = false;
    const goDashboard = () => {
      if (finished) return;
      finished = true;
      navigate('/dashboard', { replace: true });
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goDashboard();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goDashboard();
    });

    const deadline = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session && !finished) setFailed(true);
      });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(deadline);
    };
  }, [navigate]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-kern-bg px-4">
        <p className="max-w-md text-center text-sm text-kern-text-2">
          We couldn&apos;t finish signing you in. The link may have expired, or the provider isn&apos;t
          configured for this environment yet.
        </p>
        <Link
          to="/login"
          className="text-sm font-medium text-kern-text underline underline-offset-2 hover:no-underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return <AuthLoadingScreen />;
}
