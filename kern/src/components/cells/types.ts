import type { KernField, KernRow } from '@/types/kern';

/** Optional navigation after a successful cell commit (e.g. Enter moves to same column, next row). */
export type CellSaveNav = { row: 'up' | 'down' };

export type CellComponentProps = {
  value: unknown;
  field: KernField;
  row: KernRow;
  rowId: string;
  isEditing: boolean;
  onStartEdit: () => void;
  /** Persist value and optionally move selection; parent closes edit unless `nav.row` keeps another cell open. */
  onSave: (value: unknown, nav?: CellSaveNav) => void;
  onCancel: () => void;
  /** Debounced background saves while typing (table text / rich text). */
  persistWhileEditing?: (value: unknown) => void;
  /** True while a debounced save is scheduled. */
  onPendingChange?: (pending: boolean) => void;
  /** After Tab / Shift+Tab commit from an editor, move to the next or previous cell. */
  onEditNavigate?: (dir: 'next' | 'prev') => void;
};
