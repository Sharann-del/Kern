import type { FieldType, ViewConfig, ViewType } from '@/types/kern';

export const FIELD_TYPES: Array<{ type: FieldType; label: string; description: string }> = [
  { type: 'text', label: 'Text', description: 'Single-line plain text.' },
  { type: 'rich_text', label: 'Rich text', description: 'Formatted text with headings and lists.' },
  { type: 'number', label: 'Number', description: 'Numeric values with optional min, max, and unit.' },
  { type: 'date', label: 'Date', description: 'Calendar date without time.' },
  { type: 'datetime', label: 'Date & time', description: 'Timestamp including time of day.' },
  { type: 'boolean', label: 'Checkbox', description: 'True or false toggle.' },
  { type: 'select', label: 'Select', description: 'Choose one option from a list.' },
  { type: 'multi_select', label: 'Multi-select', description: 'Choose multiple options from a list.' },
  { type: 'url', label: 'URL', description: 'Web link with validation.' },
  { type: 'email', label: 'Email', description: 'Email address field.' },
  { type: 'phone', label: 'Phone', description: 'Phone number as text.' },
  { type: 'relation', label: 'Relation', description: 'Link to rows in another collection.' },
  { type: 'file', label: 'File', description: 'Upload and attach files.' },
];

export const VIEW_TYPES: Array<{ type: ViewType; label: string }> = [
  { type: 'table', label: 'Table' },
  { type: 'kanban', label: 'Kanban' },
  { type: 'calendar', label: 'Calendar' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'list', label: 'List' },
  { type: 'custom', label: 'Custom' },
];

/** Vibrant, distinct palette (rose → pink). */
export const SELECT_COLORS: string[] = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

export const COLLECTION_COLORS: string[] = [...SELECT_COLORS];

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  hidden_fields: [],
  filters: [],
  sorts: [],
  group_by_field: null,
  calendar_date_field: null,
  gallery_cover_field: null,
  gallery_card_fields: [],
  table_column_widths: {},
  kanban_collapsed_columns: [],
};
