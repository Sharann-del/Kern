import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { KernField, KernRow } from '@/types/kern';

export type CustomViewRendererProps = {
  /** Compiled JS; null = not compiled yet */
  code: string | null;
  rows: KernRow[];
  fields: KernField[];
  collectionName: string;
  onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onRowCreate: (data: Record<string, unknown>) => Promise<void>;
  onRowDelete: (rowId: string) => Promise<void>;
  onRowClick: (rowId: string) => void;
  /** Collection page: open editor */
  onOpenEditor?: () => void;
  /** Editor preview: focus Monaco / scroll to issues */
  onFixInEditor?: () => void;
};

function buildSandboxHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/recharts@2/umd/Recharts.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>html, body, #root { margin: 0; height: 100%; min-height: 100%; font-family: -apple-system, sans-serif; } body { display: block; }</style>
</head>
<body>
  <div id="root"></div>
  <script>
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const Recharts = window.Recharts;
    
    window.addEventListener('error', function (e) {
      try {
        window.parent.postMessage({ type: 'KERN_SANDBOX_ERROR', message: e.message || 'Script error' }, '*');
      } catch (_) {}
    });
    
    let reactRoot = null;
    window.addEventListener('message', (event) => {
      if (event.data.type !== 'KERN_RENDER') return;
      const { code, props } = event.data;
      
      try {
        function kernRequire(id) {
          if (id === 'react') return React;
          if (id === 'recharts') return Recharts;
          throw new Error('Unsupported import in custom view: ' + id + '. Only react and recharts are available.');
        }
        var module = { exports: {} };
        var moduleFunc = new Function('exports', 'require', 'module', code);
        moduleFunc(module.exports, kernRequire, module);
        var exp = module.exports;
        var Component = exp && exp.__esModule ? exp.default : exp;
        
        if (!Component) {
          window.parent.postMessage({ type: 'KERN_RENDER_ERROR', message: 'Component must have a default export' }, '*');
          document.getElementById('root').innerHTML = '<div style="padding:16px;color:#e5484d">Error: Component must have a default export</div>';
          return;
        }
        
        const viewProps = {
          ...props,
          onRowUpdate: (rowId, data) => window.parent.postMessage({ type: 'KERN_ROW_UPDATE', rowId, data }, '*'),
          onRowCreate: (data) => window.parent.postMessage({ type: 'KERN_ROW_CREATE', data }, '*'),
          onRowDelete: (rowId) => window.parent.postMessage({ type: 'KERN_ROW_DELETE', rowId }, '*'),
          onRowClick: (rowId) => window.parent.postMessage({ type: 'KERN_ROW_CLICK', rowId }, '*'),
        };
        
        const rootEl = document.getElementById('root');
        if (!reactRoot) {
          reactRoot = ReactDOM.createRoot(rootEl);
        }
        try {
          reactRoot.render(React.createElement(Component, viewProps));
          window.parent.postMessage({ type: 'KERN_RENDER_OK' }, '*');
        } catch (renderErr) {
          window.parent.postMessage({ type: 'KERN_RENDER_ERROR', message: renderErr.message || String(renderErr) }, '*');
        }
      } catch (err) {
        window.parent.postMessage({ type: 'KERN_RENDER_ERROR', message: err.message || String(err) }, '*');
        document.getElementById('root').innerHTML = '<div style="padding:16px;color:#e5484d;font-family:monospace;font-size:12px;white-space:pre-wrap">Error: ' + err.message + '</div>';
      }
    });
    
    window.parent.postMessage({ type: 'KERN_SANDBOX_READY' }, '*');
  </script>
</body>
</html>`;
}

export function CustomViewRenderer({
  code,
  rows,
  fields,
  collectionName,
  onRowUpdate,
  onRowCreate,
  onRowDelete,
  onRowClick,
  onOpenEditor,
  onFixInEditor,
}: CustomViewRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [iframeLoadError, setIframeLoadError] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    // Reset chrome when compiled output changes; sandbox will send KERN_RENDER_OK or KERN_RENDER_ERROR next.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived reset from prop `code`
    setPreviewError(null);
    setIframeLoadError(false);
  }, [code]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (data.type === 'KERN_SANDBOX_READY') setIsReady(true);
      if (data.type === 'KERN_RENDER_OK') setPreviewError(null);
      if (data.type === 'KERN_RENDER_ERROR' || data.type === 'KERN_SANDBOX_ERROR') {
        setPreviewError(typeof data.message === 'string' ? data.message : 'Render error');
      }
      if (data.type === 'KERN_ROW_UPDATE') {
        void onRowUpdate(data.rowId as string, data.data as Record<string, unknown>);
      }
      if (data.type === 'KERN_ROW_CREATE') {
        void onRowCreate(data.data as Record<string, unknown>);
      }
      if (data.type === 'KERN_ROW_DELETE') {
        void onRowDelete(data.rowId as string);
      }
      if (data.type === 'KERN_ROW_CLICK') {
        onRowClick(data.rowId as string);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRowUpdate, onRowCreate, onRowDelete, onRowClick]);

  useEffect(() => {
    if (!isReady || !iframeRef.current || !code) return;
    iframeRef.current.contentWindow?.postMessage(
      {
        type: 'KERN_RENDER',
        code,
        props: { rows, fields, collectionName },
      },
      '*'
    );
  }, [isReady, code, rows, fields, collectionName]);

  if (!code) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="text-kern-text-3" size={28} aria-hidden />
        <p className="max-w-sm text-sm text-kern-text-2">
          This view hasn&apos;t been compiled yet. Open the editor to compile and save.
        </p>
        {onOpenEditor ? (
          <Button type="button" variant="secondary" size="sm" onClick={onOpenEditor}>
            Open editor
          </Button>
        ) : null}
      </div>
    );
  }

  const showChromeError = iframeLoadError || previewError;

  return (
    <div
      className={cn(
        'relative flex min-h-0 w-full min-w-0 flex-1 flex-col',
        showChromeError && 'rounded-kern-md ring-2 ring-kern-danger/70'
      )}
    >
      {showChromeError ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-kern-bg/95 p-4 text-center">
          <AlertCircle className="text-kern-danger" size={24} aria-hidden />
          <p className="text-sm font-medium text-kern-text">View render error</p>
          {previewError ? (
            <p className="max-w-md font-mono text-xs text-kern-text-2">{previewError}</p>
          ) : (
            <p className="text-xs text-kern-text-2">Could not load preview.</p>
          )}
          {onFixInEditor ? (
            <Button type="button" variant="primary" size="sm" className="mt-2" onClick={onFixInEditor}>
              Fix in editor
            </Button>
          ) : null}
        </div>
      ) : null}
      {!isReady ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-kern-surface">
          <Loader2 className="animate-spin text-kern-text-3" size={24} aria-hidden />
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        srcDoc={buildSandboxHTML()}
        sandbox="allow-scripts"
        className="min-h-0 w-full min-w-0 flex-1 border-0"
        title="Custom view preview"
        onError={() => setIframeLoadError(true)}
      />
    </div>
  );
}
