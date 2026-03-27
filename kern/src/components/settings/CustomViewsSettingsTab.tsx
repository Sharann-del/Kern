import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AssignCustomViewModal } from '@/components/views/CustomView/AssignCustomViewModal';
import { Button } from '@/components/ui/Button';
import {
  useCreateCustomView,
  useCustomViews,
  useCustomViewAssignments,
  useDeleteCustomView,
  useUpdateCustomView,
} from '@/hooks/useCustomViews';
import { compileCustomViewSource } from '@/lib/custom-view-compile';
import { slugify, formatRelativeTime } from '@/lib/utils';
import type { KernCustomView } from '@/types/kern';
import { Download, Link2, Pencil, Plus, Trash2 } from 'lucide-react';

function exportCustomViewJson(view: KernCustomView) {
  const exportData = JSON.stringify(
    { name: view.name, description: view.description, code: view.code },
    null,
    2
  );
  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(view.name) || 'view'}.kern-view.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseImportJson(raw: string): { name: string; code: string; description: string | null } | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.name !== 'string' || typeof o.code !== 'string') return null;
    return {
      name: o.name,
      code: o.code,
      description: typeof o.description === 'string' ? o.description : null,
    };
  } catch {
    return null;
  }
}

export function CustomViewsSettingsTab() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: views = [], isLoading } = useCustomViews();
  const { data: assignments = [] } = useCustomViewAssignments();
  const createCustom = useCreateCustomView();
  const updateCustom = useUpdateCustomView();
  const deleteCustom = useDeleteCustomView();

  const [assignForId, setAssignForId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KernCustomView | null>(null);

  const byCustomView = (id: string) => assignments.filter((a) => a.customViewId === id);

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseImportJson(text);
    if (!parsed) {
      toast.error('Invalid file', { description: 'JSON must include name and code.' });
      return;
    }
    const name = parsed.name.trim() || 'Imported view';
    const body = parsed.code;
    try {
      const created = await createCustom.mutateAsync({
        name,
        description: parsed.description ?? null,
        code: body,
        compiled_code: null,
      });
      const { code: compiled, error } = await compileCustomViewSource(body);
      if (error || !compiled) {
        toast.message('Imported', { description: 'Saved source; fix compile errors in the editor.' });
      } else {
        await updateCustom.mutateAsync({ id: created.id, compiled_code: compiled });
        toast.success('View imported and compiled');
      }
    } catch {
      toast.error('Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-kern-text">Custom views</p>
          <p className="mt-1 text-sm text-kern-text-2">
            Reusable React views you can attach to any collection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Plus size={14} aria-hidden />
            <span className="ml-1">Import view</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-kern-text-2">Loading…</p>
      ) : views.length === 0 ? (
        <p className="text-sm text-kern-text-2">No custom views yet. Create one from a collection.</p>
      ) : (
        <div className="overflow-x-auto rounded-kern-lg border border-kern-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-kern-border bg-kern-surface">
                <th className="px-3 py-2.5 font-medium text-kern-text">Name</th>
                <th className="px-3 py-2.5 font-medium text-kern-text">Description</th>
                <th className="px-3 py-2.5 font-medium text-kern-text">Assigned to</th>
                <th className="px-3 py-2.5 font-medium text-kern-text">Created</th>
                <th className="px-3 py-2.5 font-medium text-kern-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {views.map((v) => {
                const assigned = byCustomView(v.id);
                const firstSlug = assigned[0]?.collectionSlug;
                return (
                  <tr key={v.id} className="border-b border-kern-border last:border-0">
                    <td className="px-3 py-2 align-top">
                      {firstSlug ? (
                        <button
                          type="button"
                          className="font-medium text-kern-accent hover:underline"
                          onClick={() => navigate(`/c/${firstSlug}/views/custom/${v.id}/edit`)}
                        >
                          {v.name}
                        </button>
                      ) : (
                        <span className="font-medium text-kern-text-2">{v.name}</span>
                      )}
                    </td>
                    <td className="max-w-[200px] px-3 py-2 align-top">
                      <p className="truncate text-kern-text-2">{v.description ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-kern-text-2">
                      {assigned.length === 0 ? (
                        <span>—</span>
                      ) : (
                        <span>{assigned.map((a) => a.collectionName).join(', ')}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-kern-text-2">
                      {formatRelativeTime(v.created_at)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={!firstSlug}
                          aria-label="Edit"
                          title={firstSlug ? 'Edit' : 'Assign to a collection first'}
                          onClick={() => firstSlug && navigate(`/c/${firstSlug}/views/custom/${v.id}/edit`)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="Assign"
                          onClick={() => setAssignForId(v.id)}
                        >
                          <Link2 size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="Export"
                          onClick={() => exportCustomViewJson(v)}
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-kern-danger hover:bg-red-50"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AssignCustomViewModal
        key={assignForId ?? 'closed'}
        open={assignForId !== null}
        onOpenChange={(o) => !o && setAssignForId(null)}
        customViewId={assignForId}
        assignmentRows={assignForId ? byCustomView(assignForId) : []}
      />

      <AlertDialog.Root open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] m-4 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none">
            <AlertDialog.Title className="text-base font-semibold text-kern-text">Delete custom view</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-kern-text-2">
              Remove &quot;{deleteTarget?.name}&quot; from your workspace? Collection tabs using it will unlink.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="secondary" size="sm">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={deleteCustom.isPending}
                  onClick={() => {
                    if (!deleteTarget) return;
                    const id = deleteTarget.id;
                    deleteCustom.mutate(id, {
                      onSuccess: () => {
                        setDeleteTarget(null);
                        toast.success('Custom view deleted');
                      },
                    });
                  }}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
