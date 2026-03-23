import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { fetchCollectionById } from '@/hooks/useCollections';
import { appendEdgeFunctionHintForDisplay } from '@/lib/edge-function-help';
import { describeFunctionsInvokeError } from '@/lib/functions-invoke';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing...');

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (provider !== 'github') {
        if (!cancelled) setMessage('Unknown OAuth provider');
        return;
      }

      if (oauthError) {
        if (!cancelled) {
          setMessage(
            oauthErrorDescription?.replace(/\+/g, ' ') ?? `GitHub OAuth error: ${oauthError}`
          );
        }
        return;
      }

      if (!code || !state) {
        if (!cancelled) setMessage('Missing OAuth parameters.');
        return;
      }

      const storedState = sessionStorage.getItem('oauth_state');
      if (state !== storedState) {
        if (!cancelled) setMessage('Invalid or expired OAuth state. Close this window and try again.');
        return;
      }

      const collectionId = sessionStorage.getItem('oauth_collection_id');
      const syncType = sessionStorage.getItem('github_sync_type');
      const rawFilter = sessionStorage.getItem('github_repo_filter');

      if (!collectionId || !syncType) {
        if (!cancelled) setMessage('Missing session. Open Connect from Kern and try again.');
        return;
      }

      const repoFilter = rawFilter && rawFilter.trim() ? rawFilter.trim() : null;

      const redirectUri = `${window.location.origin}/oauth/callback/github`;

      const { data, error, response } = await invokeAuthedEdgeFunction<unknown>('oauth-callback-github', {
        body: {
          code,
          collection_id: collectionId,
          sync_type: syncType,
          repo_filter: repoFilter,
          redirect_uri: redirectUri,
        },
      });

      if (error) {
        if (!cancelled) {
          const detail = await describeFunctionsInvokeError(error, response);
          setMessage(appendEdgeFunctionHintForDisplay(detail));
        }
        return;
      }

      const payload = data as { success?: boolean; error?: string; collection_id?: string } | null;
      if (!payload?.success || !payload.collection_id) {
        if (!cancelled) {
          setMessage(typeof payload?.error === 'string' ? payload.error : 'Connection failed');
        }
        return;
      }

      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_collection_id');
      sessionStorage.removeItem('github_sync_type');
      sessionStorage.removeItem('github_repo_filter');

      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: 'github' }, window.location.origin);
        window.close();
        return;
      }

      const col = await fetchCollectionById(payload.collection_id);
      if (!cancelled) {
        if (col) navigate(`/c/${col.slug}`, { replace: true });
        else navigate('/dashboard', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, navigate, code, state, oauthError, oauthErrorDescription]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-kern-bg px-4">
      <p className="max-w-lg whitespace-pre-wrap text-center text-sm text-kern-text-2">{message}</p>
    </div>
  );
}
