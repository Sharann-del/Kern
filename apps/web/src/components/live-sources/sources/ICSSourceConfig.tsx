import { useId, useState, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { invokeAuthedEdgeFunction } from '@/lib/supabase-functions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import type { Json } from '@/types/database';

export type ICSSourceConfigProps = {
  collectionId: string;
  onSuccess: () => void;
};

export function ICSSourceConfig({ collectionId, onSuccess }: ICSSourceConfigProps) {
  const baseId = useId();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: true; title: string } | { ok: false; message: string } | null>(
    null,
  );

  const testCalendar = async () => {
    const url = calendarUrl.trim();
    if (!url) {
      toast.error('Enter an ICS calendar URL');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await invokeAuthedEdgeFunction<{ ok?: boolean; title?: string; error?: string }>(
        'test-ics-calendar',
        { body: { calendar_url: url } },
      );
      if (error) {
        setTestResult({ ok: false, message: error.message });
        toast.error(error.message);
        return;
      }
      if (data?.ok && data.title) {
        setTestResult({ ok: true, title: data.title });
        toast.success(`Found calendar: ${data.title}`);
      } else {
        const msg = data?.error ?? 'Could not read calendar';
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
    if (mode === 'url' && !calendarUrl.trim()) {
      toast.error('Enter an ICS calendar URL');
      return;
    }
    if (mode === 'file' && !file) {
      toast.error('Select an ICS file to upload');
      return;
    }

    setConnecting(true);
    try {
      let liveSourceConfig: Record<string, unknown> = {};

      if (mode === 'url') {
        liveSourceConfig = { calendar_url: calendarUrl.trim() };
      } else if (file) {
        if (!user) throw new Error('Not authenticated');
        const ext = file.name.split('.').pop() ?? 'ics';
        const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('kern-files').upload(filePath, file);
        if (uploadErr) throw uploadErr;
        liveSourceConfig = { calendar_file_path: filePath };
      }

      const { error: upErr } = await supabase
        .from('collections')
        .update({
          is_live_source: true,
          live_source_type: 'ics_calendar',
          live_source_config: liveSourceConfig as Json,
          sync_status: 'syncing',
          last_synced_at: null,
          sync_error_message: null,
        })
        .eq('id', collectionId);

      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const { data: syncData, error: syncErr } = await invokeAuthedEdgeFunction<{ error?: string }>('sync-ics', {
        body: { collection_id: collectionId },
      });
      if (syncErr) {
        toast.error(syncErr.message);
        return;
      }
      if (syncData?.error) {
        toast.error(syncData.error);
        return;
      }

      toast.success('ICS calendar connected! Syncing…');
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-kern-surface-2 rounded-kern-lg">
        <button
          type="button"
          onClick={() => { setMode('url'); setTestResult(null); }}
          className={`flex-1 py-1 text-sm rounded-kern-md transition ${mode === 'url' ? 'bg-kern-bg shadow-sm text-kern-text' : 'text-kern-text-2 hover:text-kern-text'}`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => { setMode('file'); setTestResult(null); }}
          className={`flex-1 py-1 text-sm rounded-kern-md transition ${mode === 'file' ? 'bg-kern-bg shadow-sm text-kern-text' : 'text-kern-text-2 hover:text-kern-text'}`}
        >
          Upload File
        </button>
      </div>

      {mode === 'url' ? (
        <div>
          <label htmlFor={`${baseId}-url`} className="mb-1.5 block text-sm font-medium text-kern-text">
            Calendar URL (.ics)
          </label>
          <Input
            id={`${baseId}-url`}
            type="url"
            required
            value={calendarUrl}
            onChange={(e) => {
              setCalendarUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://example.com/calendar.ics"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kern-text">
            Calendar File (.ics)
          </label>
          <input
            type="file"
            accept=".ics"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </Button>
            <span className="text-sm text-kern-text-2 max-w-[200px] truncate">
              {file ? file.name : 'No file chosen'}
            </span>
          </div>
        </div>
      )}
      {testResult && (
        <p className={`text-sm ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {testResult.ok ? `✓ Found calendar: ${testResult.title}` : testResult.message}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        {mode === 'url' ? (
          <Button type="button" variant="secondary" className="flex-1" onClick={testCalendar} disabled={testing || connecting}>
            {testing ? 'Testing…' : 'Test calendar'}
          </Button>
        ) : null}
        <Button type="button" variant="primary" className="flex-1" onClick={connect} disabled={connecting || testing || (mode === 'url' ? !calendarUrl.trim() : !file)}>
          {connecting ? 'Connecting…' : 'Connect calendar'}
        </Button>
      </div>
    </div>
  );
}
