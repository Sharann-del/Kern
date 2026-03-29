import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;

export type GithubSyncType = 'prs' | 'issues' | 'repos';

export type GitHubSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

export function GitHubSourceConfig({ collectionId, onSuccess }: GitHubSourceConfigProps) {
  const baseId = useId();
  const [selectedType, setSelectedType] = useState<GithubSyncType>('prs');
  const [repoFilter, setRepoFilter] = useState('');

  const onSuccessStable = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data?.provider === 'github') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_collection_id');
        sessionStorage.removeItem('github_sync_type');
        sessionStorage.removeItem('github_repo_filter');
        onSuccessStable();
        toast.success('GitHub connected! Syncing now...');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccessStable]);

  const connect = () => {
    if (!CLIENT_ID) {
      toast.error('Missing VITE_GITHUB_CLIENT_ID');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_collection_id', collectionId);
    sessionStorage.setItem('github_sync_type', selectedType);
    sessionStorage.setItem('github_repo_filter', repoFilter.trim());
    const redirectUri = `${window.location.origin}/oauth/callback/github`;
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&scope=repo&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.open(oauthUrl, 'github-oauth', 'width=600,height=700');
  };

  const radio = (value: GithubSyncType, label: string) => {
    const id = `${baseId}-${value}`;
    return (
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-kern-text">
        <input
          id={id}
          type="radio"
          name={`${baseId}-sync`}
          className="h-3.5 w-3.5 border-kern-border text-kern-accent"
          checked={selectedType === value}
          onChange={() => setSelectedType(value)}
        />
        {label}
      </label>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-kern-text">What to sync</p>
        <div className={cn('space-y-2 rounded-kern-md border border-kern-border p-3')}>
          {radio('prs', 'Pull Requests')}
          {radio('issues', 'Issues')}
          {radio('repos', 'Repositories')}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-kern-text">Repository filter</p>
        <Input
          placeholder="owner/repo (leave empty for all)"
          value={repoFilter}
          onChange={(e) => setRepoFilter(e.target.value)}
        />
        <p className="mt-1 text-xs text-kern-text-3">Leave empty to sync from all your repositories</p>
      </div>
      <Button type="button" variant="primary" className="w-full" onClick={connect}>
        Connect GitHub
      </Button>
    </div>
  );
}
