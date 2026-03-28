import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { Paperclip } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { CellComponentProps } from '@/components/cells/types';
import { FileAttachmentRowPopover } from '@/components/files/FileAttachmentRow';
import { Button } from '@/components/ui/Button';
import { useRadixDataStateOpen } from '@/hooks/useRadixDataStateOpen';
import { asFileAttachments, useFileUpload } from '@/hooks/useFileUpload';
import { VARIANTS } from '@/lib/animations';
import { cn } from '@/lib/utils';

function UploadProgressLine() {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-kern-surface-2">
      <div className="h-full w-1/3 rounded-full bg-kern-accent animate-kern-upload-bar" />
    </div>
  );
}

export function FileCell({
  value,
  row,
  rowId,
  field,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  persistWhileEditing,
}: CellComponentProps) {
  void field;
  const files = asFileAttachments(value);
  const count = files.length;
  const firstName = files[0]?.name ?? '';
  const { uploadFile, deleteFile } = useFileUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ key: string; name: string }[]>([]);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [attachmentPopoverContent, setAttachmentPopoverContent] = useState<HTMLDivElement | null>(null);
  const attachmentPopoverOpen = useRadixDataStateOpen(attachmentPopoverContent);

  const persist = useCallback(
    (next: unknown) => {
      if (persistWhileEditing) persistWhileEditing(next);
      else onSave(next);
    },
    [persistWhileEditing, onSave]
  );

  const runUploads = useCallback(
    async (list: FileList | File[]) => {
      const arr = [...list];
      if (!arr.length) return;
      const slots = arr.map((f) => ({ key: `${f.name}-${crypto.randomUUID()}`, name: f.name }));
      setUploading((u) => [...u, ...slots]);
      let acc = asFileAttachments(value);
      try {
        for (const file of arr) {
          const att = await uploadFile(file, row.collection_id, rowId);
          acc = [...acc, att];
          persist(acc);
        }
      } catch (e) {
        console.error(e);
        toast.error('Upload failed');
      } finally {
        setUploading((u) => u.filter((x) => !slots.some((s) => s.key === x.key)));
      }
    },
    [uploadFile, row.collection_id, rowId, value, persist]
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
        persist(next);
      } catch (e) {
        console.error(e);
        toast.error('Could not delete file');
      } finally {
        setBusyPath(null);
      }
    },
    [deleteFile, files, persist]
  );

  const displayInner =
    count === 0 ? (
      <span className="text-sm text-kern-text-3">—</span>
    ) : (
      <>
        <span className="shrink-0 rounded-full bg-kern-surface-2 px-2 py-0.5 text-xs font-medium text-kern-text-2">
          {count}
        </span>
        <Paperclip size={16} className="shrink-0 text-kern-text-2" aria-hidden />
        <span className="min-w-0 truncate text-sm text-kern-text">{firstName}</span>
      </>
    );

  const displayClass = cn(
    'flex h-full w-full min-w-0 items-center gap-2 px-2 text-left',
    !isEditing && 'rounded-kern-sm outline-none hover:bg-kern-surface-2/80 focus-visible:ring-2 focus-visible:ring-kern-accent/30'
  );

  const manager = (
    <div className="flex w-[280px] max-h-[320px] flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-kern-border px-2 py-2">
          <span className="text-sm font-medium text-kern-text">Files ({count})</span>
          {isEditing ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Upload
              </Button>
            </>
          ) : null}
        </div>
        <div className="max-h-[220px] overflow-y-auto py-1">
          {files.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-kern-text-3">No files yet</p>
          ) : (
            files.map((f) => (
              <FileAttachmentRowPopover
                key={f.path}
                file={f}
                deleteDisabled={busyPath === f.path || Boolean(uploading.length)}
                onDelete={() => void removeAt(f.path)}
              />
            ))
          )}
        </div>
        {isEditing ? (
          <div className="shrink-0 border-t border-kern-border px-2 py-2">
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'cursor-pointer rounded-kern-md border border-dashed border-kern-border px-3 py-3 text-center text-sm text-kern-text-2 transition-colors',
                'hover:border-kern-accent/40 hover:bg-kern-surface-2/50'
              )}
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
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void runUploads(e.dataTransfer.files);
              }}
            >
              Drop files here or use Upload
            </div>
            {uploading.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {uploading.map((u) => (
                  <li key={u.key} className="px-1">
                    <p className="mb-1 truncate text-xs text-kern-text-3">{u.name}</p>
                    <UploadProgressLine />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
  );

  if (!isEditing) {
    return (
      <button
        type="button"
        className={displayClass}
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
      >
        {displayInner}
      </button>
    );
  }

  return (
    <PopoverPrimitive.Root open onOpenChange={(o) => !o && onCancel()}>
      <PopoverPrimitive.Anchor asChild>
        <div className={displayClass} aria-hidden>
          {displayInner}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content forceMount asChild align="start" side="bottom" sideOffset={6}>
          <motion.div
            ref={setAttachmentPopoverContent}
            className={cn(
              'z-[220] origin-[var(--radix-popover-content-transform-origin)] rounded-kern-lg border border-kern-border bg-kern-bg p-2 shadow-lg outline-none',
              !attachmentPopoverOpen && 'pointer-events-none'
            )}
            style={{ transformOrigin: 'var(--radix-popover-content-transform-origin)' }}
            variants={VARIANTS.scaleIn}
            initial="hidden"
            animate={attachmentPopoverOpen ? 'visible' : 'hidden'}
            onClick={(e) => e.stopPropagation()}
          >
            {manager}
          </motion.div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
