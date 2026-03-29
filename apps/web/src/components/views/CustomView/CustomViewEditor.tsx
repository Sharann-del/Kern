import * as AlertDialog from '@radix-ui/react-alert-dialog';
import Editor from '@monaco-editor/react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { KERN_VIEW_TYPES_DTS } from '@/lib/custom-view-types';
import { compileCustomViewSource } from '@/lib/custom-view-compile';
import { CUSTOM_VIEW_EXAMPLES } from '@/lib/custom-view-examples';
import { DEFAULT_VIEW_CONFIG } from '@/lib/constants';
import { useRows, useCreateRow, useUpdateRow, useDeleteRow } from '@/hooks/useRows';
import { useTheme } from '@/providers/ThemeProvider';
import { useAppStore } from '@/stores/appStore';
import type { KernField } from '@/types/kern';
import type * as Monaco from 'monaco-editor';

import { CustomViewRenderer } from './CustomViewRenderer';

export const CUSTOM_VIEW_STARTER_TEMPLATE = `export default function MyView({ rows, fields, onRowClick }) {
  const primaryField = fields.find(f => f.is_primary);
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">{rows.length} rows</h2>
      <div className="space-y-2">
        {rows.map(row => (
          <div
            key={row.id}
            onClick={() => onRowClick(row.id)}
            className="p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
          >
            {String(row.data[primaryField?.slug ?? ''] ?? 'Untitled')}
          </div>
        ))}
      </div>
    </div>
  );
}`;

export type CustomViewEditorSaveReason = 'manual' | 'auto';

export type CustomViewEditorSavePayload = {
  name: string;
  code: string;
  compiledCode: string;
};

export type CustomViewEditorHandle = {
  save: (reason?: CustomViewEditorSaveReason) => Promise<boolean>;
  focusMonaco: () => void;
  revealCompileIssue: () => void;
};

export type CustomViewEditorProps = {
  collectionId: string;
  collectionName: string;
  fields: KernField[];
  collectionSlug: string;
  /** When set, hydrates code/name/compiled preview (edit mode). */
  hydration?: { code: string; compiledCode: string | null; name: string } | null;
  onSave: (payload: CustomViewEditorSavePayload) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  /** When false, `save('auto')` is a no-op (e.g. new view not in DB yet). */
  allowAutosave?: boolean;
};

type EditorStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'autosaved' | 'error';

export const CustomViewEditor = forwardRef<CustomViewEditorHandle, CustomViewEditorProps>(
  function CustomViewEditor(
    {
      collectionId,
      collectionName,
      fields,
      collectionSlug,
      hydration,
      onSave,
      onDirtyChange,
      allowAutosave = true,
    },
    ref
  ) {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const monacoRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [viewName, setViewName] = useState(() => hydration?.name.trim() || 'Untitled custom view');
    const [code, setCode] = useState(() => hydration?.code ?? CUSTOM_VIEW_STARTER_TEMPLATE);
    const [compiledCode, setCompiledCode] = useState<string | null>(() => hydration?.compiledCode ?? null);
    const [compileError, setCompileError] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [status, setStatus] = useState<EditorStatus>('idle');
    const [exampleReplaceOpen, setExampleReplaceOpen] = useState(false);
    const [pendingExampleCode, setPendingExampleCode] = useState<string | null>(null);

    const { data: previewRows = [] } = useRows(collectionId, DEFAULT_VIEW_CONFIG, fields);
    const createRow = useCreateRow();
    const updateRow = useUpdateRow();
    const deleteRow = useDeleteRow();
    const openRow = useAppStore((s) => s.openRow);

    const markDirty = useCallback(
      (dirty: boolean) => {
        onDirtyChange?.(dirty);
        if (dirty) setStatus('unsaved');
      },
      [onDirtyChange]
    );

    const scheduleStatusReset = useCallback(() => {
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
      statusResetRef.current = setTimeout(() => {
        setStatus('idle');
        statusResetRef.current = null;
      }, 2000);
    }, []);

    useEffect(() => {
      return () => {
        if (statusResetRef.current) clearTimeout(statusResetRef.current);
      };
    }, []);

    useEffect(() => {
      if (!hydration || hydration.compiledCode) return;
      let cancelled = false;
      void compileCustomViewSource(hydration.code).then(({ code: out, error }) => {
        if (cancelled) return;
        if (error) {
          setCompileError(error);
          setCompiledCode(null);
          setStatus('error');
        } else {
          setCompiledCode(out);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [hydration]);

    const onRowUpdate = useCallback(
      (rowId: string, data: Record<string, unknown>) =>
        updateRow.mutateAsync({ id: rowId, collectionId, data }),
      [collectionId, updateRow]
    );

    const onRowCreate = useCallback(
      async (data: Record<string, unknown>) => {
        await createRow.mutateAsync({ collectionId, data });
      },
      [collectionId, createRow]
    );

    const onRowDelete = useCallback(
      (rowId: string) => deleteRow.mutateAsync({ id: rowId, collectionId }),
      [collectionId, deleteRow]
    );

    const onRowClick = useCallback(
      (rowId: string) => {
        openRow(rowId, collectionId);
      },
      [collectionId, openRow]
    );

    const revealCompileIssue = useCallback(() => {
      const editor = monacoRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model || !compileError) {
        editor.revealLineInCenter(1);
        editor.focus();
        return;
      }
      const m = compileError.match(/\((\d+):(\d+)\)/) ?? compileError.match(/:(\d+):(\d+)/);
      const line = m ? Number(m[1]) : 1;
      editor.revealLineInCenter(Math.max(1, line));
      editor.setPosition({ lineNumber: Math.max(1, line), column: 1 });
      editor.focus();
    }, [compileError]);

    const runSave = useCallback(
      async (reason: CustomViewEditorSaveReason): Promise<boolean> => {
        if (reason === 'auto' && !allowAutosave) return false;
        const name = viewName.trim() || 'Untitled custom view';
        setCompiling(true);
        setStatus('saving');
        setCompileError(null);
        const { code: out, error } = await compileCustomViewSource(code);
        setCompiling(false);
        if (error || !out) {
          setCompileError(error ?? 'Compilation failed');
          setStatus('error');
          return false;
        }
        setCompiledCode(out);
        try {
          await onSave({ name, code, compiledCode: out });
          markDirty(false);
          if (reason === 'auto') {
            setStatus('autosaved');
          } else {
            setStatus('saved');
          }
          scheduleStatusReset();
          return true;
        } catch {
          setStatus('error');
          return false;
        }
      },
      [allowAutosave, code, markDirty, onSave, scheduleStatusReset, viewName]
    );

    useImperativeHandle(
      ref,
      () => ({
        save: (reason = 'manual') => runSave(reason),
        focusMonaco: () => monacoRef.current?.focus(),
        revealCompileIssue,
      }),
      [runSave, revealCompileIssue]
    );

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const mod = e.metaKey || e.ctrlKey;
        if (!mod || e.key !== 's') return;
        e.preventDefault();
        void runSave('manual');
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [runSave]);

    const tryLoadExample = (nextCode: string) => {
      const isStarter = code.trim() === CUSTOM_VIEW_STARTER_TEMPLATE.trim();
      if (!isStarter && code.trim().length > 0) {
        setPendingExampleCode(nextCode);
        setExampleReplaceOpen(true);
        return;
      }
      setCode(nextCode);
      markDirty(true);
    };

    const confirmReplaceExample = () => {
      if (pendingExampleCode != null) {
        setCode(pendingExampleCode);
        markDirty(true);
      }
      setPendingExampleCode(null);
      setExampleReplaceOpen(false);
    };

    let statusEl: ReactNode = null;
    if (status === 'unsaved') {
      statusEl = <span className="text-amber-600 dark:text-amber-400">Unsaved changes •</span>;
    } else if (status === 'saving' || compiling) {
      statusEl = <span className="text-kern-text-2">Saving…</span>;
    } else if (status === 'saved') {
      statusEl = <span className="text-kern-text-2">Saved ✓</span>;
    } else if (status === 'autosaved') {
      statusEl = <span className="text-kern-text-2">Autosaved</span>;
    } else if (status === 'error') {
      statusEl = <span className="text-kern-danger">Error [1]</span>;
    }

    return (
      <div className="flex min-h-shell-main min-w-0 flex-1 flex-col bg-kern-bg">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kern-border px-3">
          <button
            type="button"
            onClick={() => navigate(`/c/${collectionSlug}`)}
            className="flex shrink-0 items-center gap-1.5 text-sm text-kern-text-2 transition-colors hover:text-kern-text"
          >
            <ArrowLeft size={16} aria-hidden />
            Back
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1">
                Examples
                <ChevronDown size={14} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {CUSTOM_VIEW_EXAMPLES.map((ex) => (
                <DropdownMenuItem key={ex.id} onClick={() => tryLoadExample(ex.code)}>
                  {ex.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="text"
            value={viewName}
            onChange={(e) => {
              setViewName(e.target.value);
              markDirty(true);
            }}
            className="mx-auto min-w-0 max-w-md flex-1 border-0 bg-transparent text-center text-sm font-medium text-kern-text outline-none ring-0 placeholder:text-kern-text-3 focus:border-b focus:border-kern-border-2 focus:ring-0"
            placeholder="View name"
            aria-label="View name"
          />
          <span className="min-w-[7rem] shrink-0 text-right text-xs">{statusEl}</span>
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={compiling}
            onClick={() => void runSave('manual')}
          >
            Save
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative flex min-h-0 w-[60%] min-w-0 flex-col border-r border-kern-border">
            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                language="typescript"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={code}
                path="custom-view.tsx"
                onChange={(v) => {
                  setCode(v ?? '');
                  markDirty(true);
                }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  tabSize: 2,
                  scrollBeyondLastLine: false,
                }}
                onMount={(editor, monaco) => {
                  monacoRef.current = editor;
                  monaco.languages.typescript.typescriptDefaults.addExtraLib(KERN_VIEW_TYPES_DTS, 'kern-types.d.ts');
                  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
                    jsx: monaco.languages.typescript.JsxEmit.React,
                    jsxFactory: 'React.createElement',
                    target: monaco.languages.typescript.ScriptTarget.ES2020,
                  });
                }}
              />
            </div>
          </div>
          <div className="flex min-h-0 w-[40%] min-w-0 flex-col border-l border-kern-border bg-kern-surface">
            <p className="shrink-0 border-b border-kern-border px-3 py-2 text-xs font-medium uppercase tracking-widest text-kern-text-3">
              Preview
            </p>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
              {!compiledCode ? (
                <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-kern-text-3">
                  {compileError ? 'Fix compilation errors and save to preview.' : 'Save to compile and preview.'}
                </div>
              ) : (
                <CustomViewRenderer
                  code={compiledCode}
                  rows={previewRows}
                  fields={fields}
                  collectionName={collectionName}
                  onRowUpdate={onRowUpdate}
                  onRowCreate={onRowCreate}
                  onRowDelete={onRowDelete}
                  onRowClick={onRowClick}
                  onFixInEditor={revealCompileIssue}
                />
              )}
            </div>
          </div>
        </div>

        {compileError ? (
          <div className="shrink-0 bg-red-600/15 px-3 py-2 font-mono text-xs text-kern-danger">{compileError}</div>
        ) : null}

        <AlertDialog.Root open={exampleReplaceOpen} onOpenChange={setExampleReplaceOpen}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[201] m-4 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-kern-xl border border-kern-border bg-kern-bg p-6 shadow-xl outline-none">
              <AlertDialog.Title className="text-base font-semibold text-kern-text">
                Replace current code?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-kern-text-2">
                This will overwrite the editor. You can still undo in Monaco (Cmd+Z).
              </AlertDialog.Description>
              <div className="mt-6 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPendingExampleCode(null)}>
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button type="button" variant="primary" size="sm" onClick={confirmReplaceExample}>
                    Replace
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    );
  }
);
