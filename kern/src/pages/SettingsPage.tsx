import * as Checkbox from '@radix-ui/react-checkbox';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Tabs from '@radix-ui/react-tabs';
import { Check, ChevronDown, Code2, Copy } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getMcpServerUrl } from '@/lib/mcp-url';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/stores/appStore';

function avatarInitials(fullName: string | null, email: string | null): string {
  const n = fullName?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return '?';
}

async function fetchAllForCollection(collectionId: string) {
  const pageSize = 1000;
  let from = 0;
  const rows: unknown[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from('rows')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function ProfileTab() {
  const { user, profile, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    setNameDraft(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    return () => {
      if (optimisticAvatarUrl) URL.revokeObjectURL(optimisticAvatarUrl);
    };
  }, [optimisticAvatarUrl]);

  const displayAvatarUrl = optimisticAvatarUrl ?? profile?.avatar_url?.trim() ?? null;
  const email = profile?.email ?? user?.email ?? '';
  const initials = avatarInitials(profile?.full_name ?? null, email || null);

  const handleAvatarFile = async (file: File | null) => {
    if (!file || !user) return;
    const prevOptimistic = optimisticAvatarUrl;
    if (prevOptimistic) URL.revokeObjectURL(prevOptimistic);
    const local = URL.createObjectURL(file);
    setOptimisticAvatarUrl(local);
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from('kern-avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('kern-avatars').getPublicUrl(path);
      const url = new URL(pub.publicUrl);
      url.searchParams.set('t', String(Date.now()));
      await updateProfile({ avatar_url: url.toString() });
      URL.revokeObjectURL(local);
      setOptimisticAvatarUrl(null);
      toast.success('Profile saved');
    } catch {
      URL.revokeObjectURL(local);
      setOptimisticAvatarUrl(null);
      toast.error('Could not upload avatar');
    }
  };

  const handleNameBlur = async () => {
    if (!profile) return;
    const next = nameDraft.trim() || null;
    const cur = profile.full_name?.trim() || null;
    if (next === cur) return;
    try {
      await updateProfile({ full_name: next });
      toast.success('Profile saved');
    } catch {
      toast.error('Could not save name');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-kern-text">Avatar</p>
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-kern-accent text-lg font-semibold text-white"
            aria-hidden={Boolean(displayAvatarUrl)}
          >
            {displayAvatarUrl ? (
              <img src={displayAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change avatar
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Input
          label="Full name"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => void handleNameBlur()}
        />
      </div>

      <div>
        <Input label="Email" value={email} disabled className="opacity-60" />
        <p className="mt-1 text-xs text-kern-text-3">Email cannot be changed here</p>
      </div>
    </div>
  );
}

function ThemePreviewLight({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'h-20 w-[120px] shrink-0 rounded-kern-md border bg-white p-2 shadow-sm transition-shadow',
        selected ? 'ring-2 ring-kern-accent ring-offset-2 ring-offset-kern-bg' : 'border-kern-border'
      )}
    >
      <div className="h-2 w-3/4 rounded-sm bg-neutral-200" />
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full rounded-sm bg-neutral-100" />
        <div className="h-1.5 w-5/6 rounded-sm bg-neutral-100" />
      </div>
    </div>
  );
}

function ThemePreviewDark({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'h-20 w-[120px] shrink-0 rounded-kern-md border border-neutral-700 bg-neutral-900 p-2 shadow-sm transition-shadow',
        selected ? 'ring-2 ring-kern-accent ring-offset-2 ring-offset-kern-bg' : ''
      )}
    >
      <div className="h-2 w-3/4 rounded-sm bg-neutral-600" />
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full rounded-sm bg-neutral-800" />
        <div className="h-1.5 w-5/6 rounded-sm bg-neutral-800" />
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const { profile, updateProfile } = useAuth();

  const applyTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    void updateProfile({
      preferences: {
        theme: t,
        sidebar_collapsed: profile?.preferences.sidebar_collapsed ?? sidebarCollapsed,
      },
    })
      .then(() => toast.success('Profile saved'))
      .catch(() => {
        toast.error('Could not save theme preference');
      });
  };

  const onSidebarPref = (checked: boolean) => {
    setSidebarCollapsed(checked);
    void updateProfile({
      preferences: {
        theme: profile?.preferences.theme ?? theme,
        sidebar_collapsed: checked,
      },
    })
      .then(() => toast.success('Profile saved'))
      .catch(() => toast.error('Could not save sidebar preference'));
  };

  const checkboxId = useId();

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-3 text-sm font-medium text-kern-text">Theme</p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            onClick={() => applyTheme('light')}
            className="flex flex-col items-center gap-2 rounded-kern-lg p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-kern-accent/40"
          >
            <ThemePreviewLight selected={theme === 'light'} />
            <span className="text-sm text-kern-text">Light</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            onClick={() => applyTheme('dark')}
            className="flex flex-col items-center gap-2 rounded-kern-lg p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-kern-accent/40"
          >
            <ThemePreviewDark selected={theme === 'dark'} />
            <span className="text-sm text-kern-text">Dark</span>
          </button>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-kern-text">Sidebar</p>
        <div className="flex items-center gap-2">
          <Checkbox.Root
            id={checkboxId}
            checked={sidebarCollapsed}
            onCheckedChange={(v) => onSidebarPref(v === true)}
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-kern-sm border border-kern-border bg-kern-bg',
              'data-[state=checked]:border-kern-accent data-[state=checked]:bg-kern-accent'
            )}
          >
            <Checkbox.Indicator>
              <Check size={12} className="text-kern-on-accent" strokeWidth={3} />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label htmlFor={checkboxId} className="cursor-pointer text-sm text-kern-text">
            Collapse sidebar by default
          </label>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const mcpUrl = getMcpServerUrl();
  const [tokenVisible, setTokenVisible] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copyUrl = () => {
    if (!mcpUrl) {
      toast.error('Supabase URL is not configured.');
      return;
    }
    void navigator.clipboard.writeText(mcpUrl);
    toast.success('Copied to clipboard');
  };

  const generateToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      toast.error('No active session');
      return;
    }
    setAccessToken(data.session.access_token);
    setTokenVisible(true);
  };

  const copyToken = () => {
    if (!accessToken) return;
    void navigator.clipboard.writeText(accessToken);
    toast.success('Copied to clipboard');
  };

  const testConnection = async () => {
    if (!mcpUrl || !accessToken) {
      toast.error('Generate a token first.');
      return;
    }
    setTesting(true);
    setTestOk(null);
    setTestErr(null);
    try {
      const res = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method: 'tools/list' }),
      });
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = null;
      }
      if (!res.ok) {
        setTestErr(text.slice(0, 200) || res.statusText);
        return;
      }
      const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
      const result = o.result && typeof o.result === 'object' ? (o.result as Record<string, unknown>) : {};
      const tools = result.tools;
      const n = Array.isArray(tools) ? tools.length : 0;
      setTestOk(`Connected! ${n} tools available`);
    } catch (e) {
      setTestErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-kern-xl border border-kern-border p-6">
      <div className="mb-4 flex items-center gap-2">
        <Code2 size={20} className="text-kern-text-2" aria-hidden />
        <h3 className="font-semibold text-kern-text">Claude MCP Integration</h3>
      </div>
      <p className="mb-6 text-sm text-kern-text-2">
        Connect Claude to your Kern workspace. Claude can read and write all your collections and
        rows using natural language.
      </p>

      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-kern-text-2">MCP Server URL</p>
        <div className="flex flex-wrap items-stretch gap-2">
          <code className="min-w-0 flex-1 break-all rounded-kern-md border border-kern-border bg-kern-surface-2 px-4 py-3 font-mono text-sm text-kern-text">
            {mcpUrl ?? '—'}
          </code>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={copyUrl}>
            <Copy size={14} aria-hidden />
            Copy
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-kern-text-2">Your Auth Token</p>
        {!tokenVisible ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void generateToken()}>
            Generate token
          </Button>
        ) : (
          <div className="flex flex-wrap items-stretch gap-2">
            <code className="min-w-0 flex-1 break-all rounded-kern-md border border-kern-border bg-kern-surface-2 px-4 py-3 font-mono text-sm text-kern-text">
              {accessToken}
            </code>
            <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={copyToken}>
              <Copy size={14} aria-hidden />
              Copy
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Keep this token private. It provides full access to your Kern data.
        </p>
      </div>

      <Collapsible.Root defaultOpen={false} className="mb-6">
        <Collapsible.Trigger className="group flex items-center gap-1 text-sm font-medium text-kern-accent outline-none">
          How to connect Claude ↓
          <ChevronDown
            size={16}
            className="transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden pt-1">
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-kern-text-2">
            <li>Copy the MCP Server URL above</li>
            <li>In Claude.ai → Settings → Integrations → Add MCP server</li>
            <li>Paste the URL and set your Auth Token as the Bearer token</li>
            <li>Test: ask Claude &quot;What collections do I have in Kern?&quot;</li>
          </ol>
        </Collapsible.Content>
      </Collapsible.Root>

      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={testing}
          onClick={() => void testConnection()}
        >
          Test connection
        </Button>
        {testOk ? <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ {testOk}</p> : null}
        {testErr ? <p className="text-sm text-kern-danger">✗ Connection failed: {testErr}</p> : null}
      </div>
    </div>
  );
}

function DeleteAccountModal({
  open,
  onOpenChange,
  email,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  onConfirm: () => void;
}) {
  const [confirmEmail, setConfirmEmail] = useState('');

  const match = confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirmEmail('');
    onOpenChange(v);
  };

  const footer = (
    <div className="flex w-full justify-end gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={!match}
        onClick={() => {
          onConfirm();
          handleOpenChange(false);
        }}
      >
        Delete account
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Delete account"
      description="This cannot be undone from the app. Type your email to confirm."
      footer={footer}
    >
      <p className="mb-3 text-sm text-kern-text-2">
        Your data will be deleted within 24 hours. Full account deletion requires server-side access;
        you have been signed out of this device.
      </p>
      <Input
        label="Email address"
        placeholder={email}
        value={confirmEmail}
        onChange={(e) => setConfirmEmail(e.target.value)}
        autoComplete="off"
      />
    </Modal>
  );
}

function DangerTab() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const email = user?.email ?? '';

  const runExport = async () => {
    try {
      const { data: collections, error: cErr } = await supabase
        .from('collections')
        .select('*')
        .order('sort_order', { ascending: true });
      if (cErr) throw cErr;
      const cols = collections ?? [];

      const fieldsByCollection: Record<string, unknown[]> = {};
      const rowsByCollection: Record<string, unknown[]> = {};

      for (const c of cols) {
        const id = (c as { id: string }).id;
        const { data: fields, error: fErr } = await supabase
          .from('fields')
          .select('*')
          .eq('collection_id', id)
          .order('sort_order', { ascending: true });
        if (fErr) throw fErr;
        fieldsByCollection[id] = fields ?? [];

        rowsByCollection[id] = await fetchAllForCollection(id);
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        collections: cols,
        fieldsByCollection,
        rowsByCollection,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kern-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export started');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
      toast.message('Signed out', { description: 'Your data will be deleted within 24 hours.' });
    } catch {
      toast.error('Could not sign out');
    }
  };

  return (
    <div className="space-y-8 rounded-kern-xl border-2 border-kern-danger/30 p-6">
      <div>
        <p className="text-sm font-medium text-kern-text">Export all data</p>
        <p className="mt-1 text-sm text-kern-text-2">Download all your Kern data as JSON</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => void runExport()}>
          Export
        </Button>
      </div>

      <div className="h-px bg-kern-border" />

      <div>
        <p className="text-sm font-medium text-kern-text">Delete account</p>
        <p className="mt-1 text-sm text-kern-text-2">
          This will permanently delete your account and all data
        </p>
        <Button type="button" variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      <DeleteAccountModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={email}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}

const TAB_TRIGGER =
  'rounded-t-kern-md px-3 py-2 text-sm font-medium text-kern-text-2 outline-none transition-colors data-[state=active]:bg-kern-surface-2 data-[state=active]:text-kern-text hover:text-kern-text';

export function SettingsPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-kern-text-2">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-8 text-2xl font-semibold text-kern-text">Settings</h1>

      <Tabs.Root defaultValue="profile" className="w-full">
        <Tabs.List className="mb-8 flex flex-wrap gap-1 border-b border-kern-border">
          <Tabs.Trigger value="profile" className={TAB_TRIGGER}>
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="appearance" className={TAB_TRIGGER}>
            Appearance
          </Tabs.Trigger>
          <Tabs.Trigger value="integrations" className={TAB_TRIGGER}>
            Integrations
          </Tabs.Trigger>
          <Tabs.Trigger value="danger" className={TAB_TRIGGER}>
            Danger zone
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile" className="outline-none">
          <ProfileTab />
        </Tabs.Content>
        <Tabs.Content value="appearance" className="outline-none">
          <AppearanceTab />
        </Tabs.Content>
        <Tabs.Content value="integrations" className="outline-none">
          <IntegrationsTab />
        </Tabs.Content>
        <Tabs.Content value="danger" className="outline-none">
          <DangerTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
