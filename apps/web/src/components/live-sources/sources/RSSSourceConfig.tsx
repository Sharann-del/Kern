import { useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export type RSSSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

export function RSSSourceConfig({ collectionId, onSuccess }: RSSSourceConfigProps) {
  const baseId = useId();
  const [feedUrl, setFeedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: true; title: string } | { ok: false; message: string } | null>(
    null,
  );

  const testFeed = async () => {
    const url = feedUrl.trim();
    if (!url) {
      toast.error('Enter a feed URL');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await invokeAuthedEdgeFunction<{ ok?: boolean; title?: string; error?: string }>(
        'test-rss-feed',
        { body: { feed_url: url } },
      );
      if (error) {
        setTestResult({ ok: false, message: error.message });
        toast.error(error.message);
        return;
      }
      if (data?.ok && data.title) {
        setTestResult({ ok: true, title: data.title });
        toast.success(`Found feed: ${data.title}`);
      } else {
        const msg = data?.error ?? 'Could not read feed';
        setTestResult({ ok: false, message: msg });
        toast.error(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const connect = async () => {
    const url = feedUrl.trim();
    if (!url) {
      toast.error('Enter a feed URL');
      return;
    }
    setConnecting(true);
    try {
      const { error: upErr } = await supabase
        .from('collections')
        .update({
          is_live_source: true,
          live_source_type: 'rss_feed',
          live_source_config: { feed_url: url } as Json,
          sync_status: 'syncing',
          last_synced_at: null,
          sync_error_message: null,
        })
        .eq('id', collectionId);

      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const { error: syncErr } = await invokeAuthedEdgeFunction('sync-rss', {
        body: { collection_id: collectionId },
      });
      if (syncErr) {
        toast.error(syncErr.message);
        return;
      }

      toast.success('RSS feed connected! Syncing…');
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${baseId}-url`} className="mb-1.5 block text-sm font-medium text-kern-text">
          Feed URL
        </label>
        <Input
          id={`${baseId}-url`}
          type="url"
          required
          value={feedUrl}
          onChange={(e) => {
            setFeedUrl(e.target.value);
            setTestResult(null);
          }}
          placeholder="https://example.com/feed.xml"
        />
      </div>
      {testResult && (
        <p className={`text-sm ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {testResult.ok ? `✓ Found feed: ${testResult.title}` : testResult.message}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" className="flex-1" onClick={testFeed} disabled={testing || connecting}>
          {testing ? 'Testing…' : 'Test feed'}
        </Button>
        <Button type="button" variant="primary" className="flex-1" onClick={connect} disabled={connecting || testing}>
          {connecting ? 'Connecting…' : 'Connect feed'}
        </Button>
      </div>
    </div>
  );
}
