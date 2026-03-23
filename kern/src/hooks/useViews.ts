import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { DEFAULT_VIEW_CONFIG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Json } from '@/types/database';
import type { KernView, ViewConfig, ViewType } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

type ViewRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  type: string;
  config: Json;
  custom_view_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function parseConfig(raw: Json): ViewConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_VIEW_CONFIG };
  const o = raw as Record<string, unknown>;
  return {
    hidden_fields: Array.isArray(o.hidden_fields) ? (o.hidden_fields as string[]) : [],
    filters: Array.isArray(o.filters) ? (o.filters as ViewConfig['filters']) : [],
    sorts: Array.isArray(o.sorts) ? (o.sorts as ViewConfig['sorts']) : [],
    group_by_field: (o.group_by_field as string | null) ?? null,
    calendar_date_field: (o.calendar_date_field as string | null) ?? null,
    gallery_cover_field: (o.gallery_cover_field as string | null) ?? null,
    gallery_card_fields: Array.isArray(o.gallery_card_fields)
      ? (o.gallery_card_fields as string[])
      : [],
    gallery_card_size:
      o.gallery_card_size === 'small' || o.gallery_card_size === 'large'
        ? o.gallery_card_size
        : 'medium',
    table_column_widths:
      o.table_column_widths && typeof o.table_column_widths === 'object' && !Array.isArray(o.table_column_widths)
        ? (o.table_column_widths as Record<string, number>)
        : {},
    kanban_collapsed_columns: Array.isArray(o.kanban_collapsed_columns)
      ? (o.kanban_collapsed_columns as string[])
      : [],
  };
}

function mapRowToView(row: ViewRow): KernView {
  return {
    id: row.id,
    collection_id: row.collection_id,
    user_id: row.user_id,
    name: row.name,
    type: row.type as ViewType,
    config: parseConfig(row.config),
    custom_view_id: row.custom_view_id,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mergeViewConfig(base: ViewConfig, partial: Partial<ViewConfig>): ViewConfig {
  return {
    ...base,
    ...partial,
    hidden_fields: partial.hidden_fields !== undefined ? partial.hidden_fields : base.hidden_fields,
    filters: partial.filters !== undefined ? partial.filters : base.filters,
    sorts: partial.sorts !== undefined ? partial.sorts : base.sorts,
    group_by_field: partial.group_by_field !== undefined ? partial.group_by_field : base.group_by_field,
    calendar_date_field:
      partial.calendar_date_field !== undefined
        ? partial.calendar_date_field
        : base.calendar_date_field,
    gallery_cover_field:
      partial.gallery_cover_field !== undefined
        ? partial.gallery_cover_field
        : base.gallery_cover_field,
    gallery_card_fields:
      partial.gallery_card_fields !== undefined
        ? partial.gallery_card_fields
        : base.gallery_card_fields,
    gallery_card_size:
      partial.gallery_card_size !== undefined ? partial.gallery_card_size : base.gallery_card_size,
    table_column_widths:
      partial.table_column_widths !== undefined
        ? { ...base.table_column_widths, ...partial.table_column_widths }
        : base.table_column_widths,
    kanban_collapsed_columns:
      partial.kanban_collapsed_columns !== undefined
        ? partial.kanban_collapsed_columns
        : base.kanban_collapsed_columns,
  };
}

export async function fetchViewsForCollection(collectionId: string): Promise<KernView[]> {
  const { data, error } = await supabase
    .from('views')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ViewRow[]).map(mapRowToView);
}

export function useViews(collectionId: string): UseQueryResult<KernView[]> {
  return useQuery({
    queryKey: ['views', collectionId],
    queryFn: () => fetchViewsForCollection(collectionId),
    enabled: Boolean(collectionId),
    staleTime: 120_000,
    placeholderData: keepPreviousData,
  });
}

function defaultViewName(type: ViewType): string {
  const labels: Record<ViewType, string> = {
    table: 'Table view',
    kanban: 'Kanban view',
    calendar: 'Calendar view',
    gallery: 'Gallery view',
    list: 'List view',
    custom: 'Custom view',
  };
  return labels[type] ?? 'View';
}

export type CreateViewInput = {
  collectionId: string;
  type: ViewType;
  name?: string;
};

export function useCreateView() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, type, name }: CreateViewInput) => {
      if (!userId) throw new Error('Not signed in');

      const { data: maxRow, error: maxErr } = await supabase
        .from('views')
        .select('sort_order')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const sort_order = (maxRow?.sort_order ?? -1) + 1;

      const { error } = await supabase.from('views').insert({
        collection_id: collectionId,
        user_id: userId,
        name: name?.trim() || defaultViewName(type),
        type,
        config: DEFAULT_VIEW_CONFIG as unknown as Json,
        sort_order,
      });
      if (error) throw error;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['views', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type UpdateViewInput = {
  id: string;
  collectionId: string;
  config?: Partial<ViewConfig>;
  name?: string;
};

export function useUpdateView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, collectionId, config: configPartial, name }: UpdateViewInput) => {
      const views = queryClient.getQueryData<KernView[]>(['views', collectionId]);
      const current = views?.find((v) => v.id === id);
      if (!current) {
        const { data: row, error: fetchErr } = await supabase
          .from('views')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchErr) throw fetchErr;
        const v = mapRowToView(row as ViewRow);
        const mergedConfig = configPartial ? mergeViewConfig(v.config, configPartial) : v.config;
        const { error } = await supabase
          .from('views')
          .update({
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(configPartial !== undefined ? { config: mergedConfig as unknown as Json } : {}),
          })
          .eq('id', id);
        if (error) throw error;
        return;
      }

      const mergedConfig = configPartial ? mergeViewConfig(current.config, configPartial) : current.config;
      const { error } = await supabase
        .from('views')
        .update({
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(configPartial !== undefined ? { config: mergedConfig as unknown as Json } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, collectionId, config: configPartial, name }) => {
      await queryClient.cancelQueries({ queryKey: ['views', collectionId] });
      const prev = queryClient.getQueryData<KernView[]>(['views', collectionId]);
      if (!prev) return { prev };

      const next = prev.map((v) => {
        if (v.id !== id) return v;
        return {
          ...v,
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(configPartial !== undefined ? { config: mergeViewConfig(v.config, configPartial) } : {}),
        };
      });
      queryClient.setQueryData<KernView[]>(['views', collectionId], next);
      return { prev };
    },
    onError: (err, { collectionId }, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['views', collectionId], ctx.prev);
      }
      toastMutationError(err);
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.collectionId) {
        void queryClient.invalidateQueries({ queryKey: ['views', vars.collectionId] });
      }
    },
  });
}

export type DeleteViewInput = {
  id: string;
  collectionId: string;
};

export function useDeleteView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteViewInput) => {
      const { error } = await supabase.from('views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['views', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}
