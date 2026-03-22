import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { startOfDay } from 'date-fns';

import { applyFilters } from '@/lib/apply-filters';
import { toastMutationError } from '@/lib/toast-errors';
import { applySorts } from '@/lib/apply-sorts';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { KernField, KernRow, SelectFieldOptions, ViewConfig } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

export function invalidateRowRelatedQueries(queryClient: QueryClient, collectionId: string) {
  void queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
  void queryClient.invalidateQueries({ queryKey: ['rowsDashboard', collectionId] });
  void queryClient.invalidateQueries({ queryKey: ['rowsCountToday', collectionId] });
  void queryClient.invalidateQueries({ queryKey: ['collectionById', collectionId] });
  void queryClient.invalidateQueries({ queryKey: ['collections'] });
}

type RowDb = {
  id: string;
  collection_id: string;
  user_id: string;
  data: Json;
  external_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapRowToKernRow(r: RowDb): KernRow {
  return {
    id: r.id,
    collection_id: r.collection_id,
    user_id: r.user_id,
    data:
      r.data && typeof r.data === 'object' && !Array.isArray(r.data)
        ? (r.data as Record<string, unknown>)
        : {},
    external_id: r.external_id,
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function fieldsQueryKeyFragment(fields?: KernField[]): string {
  if (!fields?.length) return '[]';
  return JSON.stringify(
    fields.map((f) => ({
      id: f.id,
      slug: f.slug,
      t: f.type,
      items:
        f.type === 'select' || f.type === 'multi_select'
          ? ((f.options as SelectFieldOptions | null)?.items ?? []).map((x) => [x.id, x.label])
          : undefined,
    }))
  );
}

function rowsQueryKey(collectionId: string, viewConfig?: ViewConfig, fields?: KernField[]) {
  const filtersKey = JSON.stringify(viewConfig?.filters ?? []);
  const sortsKey = JSON.stringify(viewConfig?.sorts ?? []);
  const fieldsKey = fieldsQueryKeyFragment(fields);
  return ['rows', collectionId, filtersKey, sortsKey, fieldsKey] as const;
}

export function useRowsDashboard(collectionId: string | null) {
  return useQuery({
    queryKey: ['rowsDashboard', collectionId ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rows')
        .select('*')
        .eq('collection_id', collectionId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RowDb[];
    },
    enabled: Boolean(collectionId),
    staleTime: 10_000,
    select: (rows) => rows.map(mapRowToKernRow),
  });
}

export function useRowsCreatedTodayCount(collectionId: string | null) {
  return useQuery({
    queryKey: ['rowsCountToday', collectionId ?? ''],
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const { count, error } = await supabase
        .from('rows')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collectionId as string)
        .gte('created_at', start);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(collectionId),
    staleTime: 30_000,
  });
}

export function useRows(
  collectionId: string,
  viewConfig?: ViewConfig,
  fields?: KernField[]
): UseQueryResult<KernRow[]> {
  return useQuery({
    queryKey: rowsQueryKey(collectionId, viewConfig, fields),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rows')
        .select('*')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RowDb[];
    },
    enabled: Boolean(collectionId),
    staleTime: 10_000,
    select: (result) => {
      const kernRows = result.map(mapRowToKernRow);
      const filtered = applyFilters(kernRows, viewConfig?.filters ?? [], fields ?? []);
      return applySorts(filtered, viewConfig?.sorts ?? [], fields ?? []);
    },
  });
}

export function useRow(rowId: string): UseQueryResult<KernRow | null> {
  return useQuery({
    queryKey: ['row', rowId],
    queryFn: async () => {
      const { data, error } = await supabase.from('rows').select('*').eq('id', rowId).single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return mapRowToKernRow(data as RowDb);
    },
    enabled: Boolean(rowId),
    staleTime: 0,
  });
}

export type CreateRowInput = {
  collectionId: string;
  data?: Record<string, unknown>;
};

export function useCreateRow() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, data }: CreateRowInput): Promise<KernRow> => {
      if (!userId) throw new Error('Not signed in');

      const { data: maxRow, error: maxErr } = await supabase
        .from('rows')
        .select('sort_order')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxErr) throw maxErr;
      const sort_order = (maxRow?.sort_order ?? -1) + 1;

      const { data: created, error } = await supabase
        .from('rows')
        .insert({
          collection_id: collectionId,
          user_id: userId,
          data: (data ?? {}) as Json,
          sort_order,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapRowToKernRow(created as RowDb);
    },
    onMutate: async ({ collectionId, data }) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ['rows', collectionId] });
      const previous = queryClient.getQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] });
      const tempId = crypto.randomUUID();
      const optimistic: KernRow = {
        id: tempId,
        collection_id: collectionId,
        user_id: userId,
        data: data ?? {},
        external_id: null,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] }, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
      return { previous, tempId };
    },
    onError: (err, { collectionId }, ctx) => {
      ctx?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      invalidateRowRelatedQueries(queryClient, collectionId);
      toastMutationError(err);
    },
    onSuccess: (created, { collectionId }, ctx) => {
      queryClient.setQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] }, (old) => {
        if (!old) return [created];
        return old.map((r) => (r.id === ctx?.tempId ? created : r));
      });
    },
    onSettled: (_d, _e, { collectionId }) => {
      invalidateRowRelatedQueries(queryClient, collectionId);
    },
  });
}

export type UpdateRowInput = {
  id: string;
  collectionId: string;
  data?: Record<string, unknown>;
  sortOrder?: number;
};

export function useUpdateRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, collectionId, data, sortOrder }: UpdateRowInput) => {
      if (data === undefined && sortOrder === undefined) {
        throw new Error('useUpdateRow: provide data and/or sortOrder');
      }
      const patch: { data?: Json; sort_order?: number } = {};
      if (data !== undefined) {
        const rows = queryClient.getQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] });
        let baseData: Record<string, unknown> = {};
        for (const [, list] of rows) {
          const hit = list?.find((r) => r.id === id);
          if (hit) {
            baseData = { ...hit.data };
            break;
          }
        }
        if (Object.keys(baseData).length === 0) {
          const { data: row, error } = await supabase.from('rows').select('data').eq('id', id).single();
          if (error) throw error;
          baseData =
            row?.data && typeof row.data === 'object' && !Array.isArray(row.data)
              ? (row.data as Record<string, unknown>)
              : {};
        }
        patch.data = { ...baseData, ...data } as Json;
      }
      if (sortOrder !== undefined) {
        patch.sort_order = sortOrder;
      }
      const { error } = await supabase.from('rows').update(patch).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, collectionId, data, sortOrder }) => {
      await queryClient.cancelQueries({ queryKey: ['rows', collectionId] });
      const previous = queryClient.getQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] });
      queryClient.setQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] }, (old) => {
        if (!old) return old;
        return old.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            ...(data !== undefined ? { data: { ...r.data, ...data } } : {}),
            ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
            updated_at: new Date().toISOString(),
          };
        });
      });
      return { previous };
    },
    onError: (err, _variables, ctx) => {
      ctx?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toastMutationError(err);
    },
    onSettled: (_d, _e, { collectionId }) => {
      invalidateRowRelatedQueries(queryClient, collectionId);
    },
  });
}

export type DeleteRowInput = {
  id: string;
  collectionId: string;
};

export function useDeleteRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteRowInput) => {
      const { error } = await supabase.from('rows').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, collectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['rows', collectionId] });
      const previous = queryClient.getQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] });
      queryClient.setQueriesData<KernRow[]>({ queryKey: ['rows', collectionId] }, (old) =>
        old ? old.filter((r) => r.id !== id) : old
      );
      return { previous };
    },
    onError: (err, _variables, ctx) => {
      ctx?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toastMutationError(err);
    },
    onSettled: (_d, _e, { collectionId }) => {
      invalidateRowRelatedQueries(queryClient, collectionId);
    },
  });
}

export type DeleteRowsInput = {
  ids: string[];
  collectionId: string;
};

export function useDeleteRows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids }: DeleteRowsInput) => {
      if (!ids.length) return;
      const { error } = await supabase.from('rows').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_void, { collectionId }) => {
      invalidateRowRelatedQueries(queryClient, collectionId);
    },
    onError: (e) => toastMutationError(e),
  });
}

export function useDuplicateRow() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ row }: { row: KernRow }) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase.from('rows').insert({
        collection_id: row.collection_id,
        user_id: userId,
        data: { ...row.data } as Json,
        sort_order: row.sort_order + 1,
      });
      if (error) throw error;
    },
    onSuccess: (_void, { row }) => {
      invalidateRowRelatedQueries(queryClient, row.collection_id);
    },
    onError: (e) => toastMutationError(e),
  });
}
