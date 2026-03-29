import { ExternalLink, FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { FileAttachment } from '@/hooks/useFileUpload';
import { useFileUrl } from '@/hooks/useFileUpload';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeGlyph({ type, className }: { type: string; className?: string }) {
  if (type.startsWith('image/')) return <ImageIcon size={16} className={className} aria-hidden />;
  if (type === 'application/pdf' || type.includes('pdf')) return <FileText size={16} className={className} aria-hidden />;
  return <Paperclip size={16} className={className} aria-hidden />;
}

function FileRowActions({
  path,
  fileName,
  onDelete,
  deleteDisabled,
}: {
  path: string;
  fileName: string;
  onDelete: () => void | Promise<void>;
  deleteDisabled?: boolean;
}) {
  const { data: href, isLoading } = useFileUrl(path);

  return (
    <>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-kern-sm text-kern-text-2 hover:bg-kern-surface-2 hover:text-kern-text"
          title="Open"
        >
          <ExternalLink size={16} aria-hidden />
        </a>
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center text-kern-text-3"
          title={isLoading ? 'Loading…' : ''}
        >
          <ExternalLink size={16} className="opacity-40" aria-hidden />
        </span>
      )}
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        disabled={deleteDisabled}
        aria-label={`Remove ${fileName}`}
        onClick={() => void onDelete()}
      >
        <X size={16} />
      </Button>
    </>
  );
}

export function FileAttachmentRowPopover({
  file,
  onDelete,
  deleteDisabled,
}: {
  file: FileAttachment;
  onDelete: () => void | Promise<void>;
  deleteDisabled?: boolean;
}) {
  return (
    <div className="flex h-10 items-center gap-2 px-2">
      <FileTypeGlyph type={file.type} className="shrink-0 text-kern-text-2" />
      <span className="min-w-0 flex-1 truncate text-sm text-kern-text" title={file.name}>
        {file.name}
      </span>
      <span className="shrink-0 text-xs text-kern-text-3">{formatFileSize(file.size)}</span>
      <FileRowActions path={file.path} fileName={file.name} onDelete={onDelete} deleteDisabled={deleteDisabled} />
    </div>
  );
}

export function FileAttachmentRowPanel({
  file,
  onDelete,
  deleteDisabled,
}: {
  file: FileAttachment;
  onDelete: () => void | Promise<void>;
  deleteDisabled?: boolean;
}) {
  const showThumb = file.type.startsWith('image/');
  const { data: thumbUrl } = useFileUrl(showThumb ? file.path : null);

  return (
    <div className="flex min-h-12 items-center gap-3 px-2 py-1.5">
      {showThumb && thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="h-12 w-16 shrink-0 rounded-kern-sm object-cover"
          loading="lazy"
        />
      ) : showThumb ? (
        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-kern-sm bg-kern-surface-2">
          <ImageIcon size={18} className="text-kern-text-3" aria-hidden />
        </div>
      ) : (
        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-kern-sm bg-kern-surface-2">
          <FileTypeGlyph type={file.type} className="text-kern-text-2" />
        </div>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-kern-text" title={file.name}>
        {file.name}
      </span>
      <span className="shrink-0 text-xs text-kern-text-3">{formatFileSize(file.size)}</span>
      <FileRowActions path={file.path} fileName={file.name} onDelete={onDelete} deleteDisabled={deleteDisabled} />
    </div>
  );
}
