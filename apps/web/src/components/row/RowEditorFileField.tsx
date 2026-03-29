import { Upload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { FileAttachmentRowPanel } from '@/components/files/FileAttachmentRow';
import { asFileAttachments, useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';
import type { KernRow } from '@/types/kern';

function UploadProgressLine() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-kern-surface-2">
      <div className="h-full w-1/3 rounded-full bg-kern-accent animate-kern-upload-bar" />
    </div>
  );
}

export function RowEditorFileField({
  slug,
  row,
  mutateBanner,
}: {
  slug: string;
  row: KernRow;
  mutateBanner: (slug: string, v: unknown) => void;
}) {
  const value = row.data[slug];
  const files = asFileAttachments(value);
  const { uploadFile, deleteFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<{ key: string; name: string }[]>([]);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const runUploads = useCallback(
    async (list: FileList | File[]) => {
      const arr = [...list];
      if (!arr.length) return;
      const slots = arr.map((f) => ({ key: `${f.name}-${crypto.randomUUID()}`, name: f.name }));
      setUploading((u) => [...u, ...slots]);
      let acc = asFileAttachments(value);
      try {
        for (const file of arr) {
          const att = await uploadFile(file, row.collection_id, row.id);
          acc = [...acc, att];
          mutateBanner(slug, acc);
        }
      } catch (e) {
        console.error(e);
        toast.error('Upload failed');
      } finally {
        setUploading((u) => u.filter((x) => !slots.some((s) => s.key === x.key)));
      }
    },
    [uploadFile, row.collection_id, row.id, slug, value, mutateBanner]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fl = e.target.files;
      e.target.value = '';
      void runUploads(fl ?? []);
    },
    [runUploads]
  );

  const removeAt = useCallback(
    async (path: string) => {
      setBusyPath(path);
      try {
        await deleteFile(path);
        const next = files.filter((f) => f.path !== path);
        mutateBanner(slug, next);
      } catch (e) {
        console.error(e);
        toast.error('Could not delete file');
      } finally {
        setBusyPath(null);
      }
    },
    [deleteFile, files, mutateBanner, slug]
  );

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          void runUploads(e.dataTransfer.files);
        }}
        className={cn(
          'cursor-pointer rounded-kern-lg border border-dashed border-kern-border p-6 text-center transition-colors',
          dragOver ? 'bg-kern-accent/5 border-kern-accent/30' : 'hover:border-kern-accent/40 hover:bg-kern-surface-2/40'
        )}
      >
        <Upload className="mx-auto mb-2 h-8 w-8 text-kern-text-3" aria-hidden />
        <p className="text-sm text-kern-text-2">Drop files here or click to browse</p>
      </div>

      {uploading.length > 0 ? (
        <ul className="space-y-2 rounded-kern-md border border-kern-border bg-kern-surface-2/40 p-2">
          {uploading.map((u) => (
            <li key={u.key}>
              <p className="mb-1 truncate text-xs text-kern-text-3">{u.name}</p>
              <UploadProgressLine />
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <div className="divide-y divide-kern-border rounded-kern-md border border-kern-border">
          {files.map((f) => (
            <FileAttachmentRowPanel
              key={f.path}
              file={f}
              deleteDisabled={busyPath === f.path || Boolean(uploading.length)}
              onDelete={() => void removeAt(f.path)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
