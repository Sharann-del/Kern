import type { CellComponentProps } from '@/components/cells/types';

type FileEntry = { name?: string; url?: string };

function asFiles(value: unknown): FileEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is FileEntry => x !== null && typeof x === 'object');
}

export function FileCell({ value, row: _row }: CellComponentProps) {
  void _row;
  const files = asFiles(value);
  const count = files.length;
  const firstName = files[0]?.name ?? files[0]?.url ?? '';

  if (count === 0) {
    return (
      <div className="flex h-full w-full items-center px-2 text-sm text-kern-text-3" title="File uploads — Phase 2">
        No files
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 items-center gap-2 px-2 text-sm" title="File editing — Phase 2">
      <span className="shrink-0 rounded-full bg-kern-surface-2 px-2 py-0.5 text-xs font-medium text-kern-text-2">
        {count}
      </span>
      <span className="min-w-0 truncate text-kern-text">{firstName || 'Attachment'}</span>
    </div>
  );
}
