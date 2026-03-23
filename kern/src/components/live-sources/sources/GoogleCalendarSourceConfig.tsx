import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export type GoogleCalendarSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export function GoogleCalendarSourceConfig({ collectionId, onSuccess }: GoogleCalendarSourceConfigProps) {
  const baseId = useId();
  const [calendarId, setCalendarId] = useState('primary');
  const [syncDaysBack, setSyncDaysBack] = useState<30 | 90 | 365>(90);

  const onSuccessStable = useCallback(() => {
    onSuccess();
  }, [onSuccess]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'OAUTH_SUCCESS' && e.data?.provider === 'google') {
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_collection_id');
        sessionStorage.removeItem('google_calendar_id');
        sessionStorage.removeItem('google_sync_days_back');
        onSuccessStable();
        toast.success('Google Calendar connected! Syncing now…');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccessStable]);

  const connect = () => {
    if (!CLIENT_ID) {
      toast.error('Missing VITE_GOOGLE_CLIENT_ID');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_collection_id', collectionId);
    sessionStorage.setItem('google_calendar_id', calendarId.trim() || 'primary');
    sessionStorage.setItem('google_sync_days_back', String(syncDaysBack));
    const redirectUri = `${window.location.origin}/oauth/callback/google`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    window.open(oauthUrl, 'google-oauth', 'width=600,height=700');
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${baseId}-cal`} className="mb-1.5 block text-sm font-medium text-kern-text">
          Calendar ID
        </label>
        <Input
          id={`${baseId}-cal`}
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder="primary"
        />
        <p className="mt-1 text-xs text-kern-text-3">Use &quot;primary&quot; for your main calendar.</p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-kern-text">Sync events from last</p>
        <div className="flex flex-wrap gap-3">
          {([30, 90, 365] as const).map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2 text-sm text-kern-text">
              <input
                type="radio"
                name={`${baseId}-days`}
                checked={syncDaysBack === d}
                onChange={() => setSyncDaysBack(d)}
                className="h-3.5 w-3.5 border-kern-border text-kern-accent"
              />
              {d} days
            </label>
          ))}
        </div>
      </div>
      <Button type="button" variant="primary" className="w-full" onClick={connect}>
        Connect Google Calendar
      </Button>
    </div>
  );
}
