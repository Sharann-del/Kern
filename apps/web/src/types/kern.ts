export type FieldType =
  | 'text'
  | 'rich_text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone'
  | 'relation'
  | 'file';
export type ViewType = 'table' | 'kanban' | 'calendar' | 'gallery' | 'list' | 'custom';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type LiveSourceType =
  | 'github_prs'
  | 'github_issues'
  | 'github_repos'
  | 'google_calendar_events'
  | 'notion_database'
  | 'linear_issues'
  | 'linear_projects'
  | 'rss_feed'
  | 'ics_calendar'
  | 'akiflow_tasks'
  | 'apple_calendar_events';
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'before'
  | 'after'
  | 'on';
export type DashboardWidgetType =
  | 'collection_stats'
  | 'recent_rows'
  | 'view_embed'
  | 'live_source_status'
  | 'quick_add';

export interface SelectOption {
  id: string;
  label: string;
  color: string;
  sort_order: number;
}
export interface SelectFieldOptions {
  items: SelectOption[];
}
export interface NumberFieldOptions {
  unit?: string;
  decimal_places?: number;
  show_as_progress?: boolean;
  min?: number;
  max?: number;
}
export interface RelationFieldOptions {
  target_collection_id: string;
  display: 'single' | 'multiple';
}
export interface FileFieldOptions {
  max_size_mb?: number;
  allowed_types?: string[];
}
export type FieldOptions =
  | SelectFieldOptions
  | NumberFieldOptions
  | RelationFieldOptions
  | FileFieldOptions
  | null;

export interface FilterRule {
  id: string;
  field_slug: string;
  operator: FilterOperator;
  value: unknown;
}
export interface SortRule {
  id: string;
  field_slug: string;
  direction: 'asc' | 'desc';
}
export interface ViewConfig {
  hidden_fields: string[];
  filters: FilterRule[];
  sorts: SortRule[];
  group_by_field: string | null;
  calendar_date_field: string | null;
  gallery_cover_field: string | null;
  gallery_card_fields: string[];
  /** Card width in gallery grid (default medium). */
  gallery_card_size: 'small' | 'medium' | 'large';
  table_column_widths: Record<string, number>;
  kanban_collapsed_columns: string[];
}

export interface KernProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme: 'light' | 'dark';
    sidebar_collapsed: boolean;
    /** Set after the user has at least one collection (onboarding complete). */
    onboarded?: boolean;
  };
  created_at: string;
  updated_at: string;
}
export interface KernCollection {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  /** Emoji character(s), or `lucide:IconName` (Lucide export name, e.g. `lucide:Table2`). */
  icon: string | null;
  color: string | null;
  description: string | null;
  is_live_source: boolean;
  live_source_type: LiveSourceType | null;
  live_source_config: Record<string, unknown> | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error_message: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  row_count?: number;
}
export interface KernField {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  slug: string;
  type: FieldType;
  options: FieldOptions;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
  created_at: string;
}
export interface KernRow {
  id: string;
  collection_id: string;
  user_id: string;
  data: Record<string, unknown>;
  external_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  relations?: Record<string, KernRow[]>;
}
export interface KernView {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  custom_view_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export interface KernRowRelation {
  id: string;
  user_id: string;
  source_row_id: string;
  target_row_id: string;
  field_id: string;
  created_at: string;
}
export interface KernCustomView {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  code: string;
  compiled_code: string | null;
  is_published: boolean;
  published_slug: string | null;
  created_at: string;
  updated_at: string;
}
export interface KernViewProps {
  rows: KernRow[];
  fields: KernField[];
  collectionName: string;
  onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onRowCreate: (data: Record<string, unknown>) => Promise<void>;
  onRowDelete: (rowId: string) => Promise<void>;
  onRowClick: (rowId: string) => void;
}
export interface DashboardWidget {
  id: string;
  user_id: string;
  type: DashboardWidgetType;
  title: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}
