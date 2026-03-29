import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
const CLIENT_ID = import.meta.env.VITE_LINEAR_CLIENT_ID as string | undefined;

export type LinearSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

export function LinearSourceConfig({ collectionId, onSuccess }: LinearSourceConfigProps) {
  const onSuccessStable = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data?.provider === 'linear') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_collection_id');
        onSuccessStable();
        toast.success('Linear connected! Syncing now...');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccessStable]);

  const connect = () => {
    if (!CLIENT_ID) {
      toast.error('Missing VITE_LINEAR_CLIENT_ID');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_collection_id', collectionId);
    const redirectUri = `${window.location.origin}/oauth/callback/linear`;
    const oauthUrl = `https://linear.app/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read&state=${encodeURIComponent(state)}`;
    window.open(oauthUrl, 'linear-oauth', 'width=600,height=720');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-kern-text-2">
        Connect Linear to import issues you can access. Status is synced as a select field; labels are stored as
        comma-separated text.
      </p>
      <Button type="button" variant="primary" className="w-full" onClick={connect}>
        Connect Linear
      </Button>
    </div>
  );
}
