import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { DEFAULT_VIEW_CONFIG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Json } from '@/types/database';
import type { KernCustomView } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

type CustomViewRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  code: string;
  compiled_code: string | null;
  is_published: boolean;
  published_slug: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: CustomViewRow): KernCustomView {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    code: row.code,
    compiled_code: row.compiled_code,
    is_published: row.is_published,
    published_slug: row.published_slug,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchCustomViewsForUser(userId: string): Promise<KernCustomView[]> {
  const { data, error } = await supabase
    .from('custom_views_registry')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CustomViewRow[]).map(mapRow);
}

export function useCustomViews(): UseQueryResult<KernCustomView[]> {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['custom_views', userId ?? ''],
    queryFn: () => fetchCustomViewsForUser(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export async function fetchCustomViewById(id: string): Promise<KernCustomView | null> {
  const { data, error } = await supabase.from('custom_views_registry').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as CustomViewRow);
}

export function useCustomView(id: string | undefined): UseQueryResult<KernCustomView | null> {
  return useQuery({
    queryKey: ['custom_view', id ?? ''],
    queryFn: () => fetchCustomViewById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export type CreateCustomViewInput = {
  name: string;
  description?: string | null;
  code: string;
  compiled_code: string | null;
};

export function useCreateCustomView() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomViewInput): Promise<KernCustomView> => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('custom_views_registry')
        .insert({
          user_id: userId,
          name: input.name.trim(),
          description: input.description ?? null,
          code: input.code,
          compiled_code: input.compiled_code,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapRow(data as CustomViewRow);
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['custom_views', userId] });
      void queryClient.invalidateQueries({ queryKey: ['custom_view_assignments'] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type UpdateCustomViewInput = {
  id: string;
  name?: string;
  description?: string | null;
  code?: string;
  compiled_code?: string | null;
};

export function useUpdateCustomView() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateCustomViewInput) => {
      const row: Record<string, unknown> = {};
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.description !== undefined) row.description = patch.description;
      if (patch.code !== undefined) row.code = patch.code;
      if (patch.compiled_code !== undefined) row.compiled_code = patch.compiled_code;
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase.from('custom_views_registry').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, { id }) => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['custom_views', userId] });
      void queryClient.invalidateQueries({ queryKey: ['custom_view', id] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export function useDeleteCustomView() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_views_registry').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, id) => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['custom_views', userId] });
      void queryClient.invalidateQueries({ queryKey: ['custom_view', id] });
      void queryClient.invalidateQueries({ queryKey: ['custom_view_assignments'] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type AssignCustomViewInput = {
  customViewId: string;
  collectionId: string;
};

export type CustomViewAssignmentRow = {
  viewRowId: string;
  customViewId: string;
  collectionId: string;
  collectionName: string;
  collectionSlug: string;
};

export async function fetchCustomViewAssignments(): Promise<CustomViewAssignmentRow[]> {
  const { data, error } = await supabase
    .from('views')
    .select('id, custom_view_id, collection_id, collections(name, slug)')
    .eq('type', 'custom')
    .not('custom_view_id', 'is', null);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    custom_view_id: string;
    collection_id: string;
    collections: { name: string; slug: string } | null;
  }>;

  return rows
    .filter((r) => r.collections)
    .map((r) => ({
      viewRowId: r.id,
      customViewId: r.custom_view_id,
      collectionId: r.collection_id,
      collectionName: r.collections!.name,
      collectionSlug: r.collections!.slug,
    }));
}

export function useCustomViewAssignments(): UseQueryResult<CustomViewAssignmentRow[]> {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['custom_view_assignments', userId ?? ''],
    queryFn: () => fetchCustomViewAssignments(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

export function useAssignCustomView() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customViewId, collectionId }: AssignCustomViewInput): Promise<string> => {
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

      const { data: inserted, error } = await supabase
        .from('views')
        .insert({
          collection_id: collectionId,
          user_id: userId,
          name: 'Custom view',
          type: 'custom',
          custom_view_id: customViewId,
          config: DEFAULT_VIEW_CONFIG as unknown as Json,
          sort_order,
        })
        .select('id')
        .single();
      if (error) throw error;
      return inserted.id as string;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['views', collectionId] });
      void queryClient.invalidateQueries({ queryKey: ['custom_view_assignments'] });
    },
    onError: (e) => toastMutationError(e),
  });
}
