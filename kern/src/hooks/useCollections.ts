import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Json } from '@/types/database';
import type { KernCollection } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_live_source: boolean;
  live_source_type: string | null;
  live_source_config: Json | null;
  last_synced_at: string | null;
  sync_status: string;
  sync_error_message: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  rows?: { count: number }[] | null;
};

function mapRowToCollection(row: CollectionRow): KernCollection {
  const count =
    Array.isArray(row.rows) && row.rows[0] != null && typeof row.rows[0].count === 'number'
      ? Number(row.rows[0].count)
      : 0;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    color: row.color,
    description: row.description,
    is_live_source: row.is_live_source,
    live_source_type: row.live_source_type as KernCollection['live_source_type'],
    live_source_config: (row.live_source_config as Record<string, unknown> | null) ?? null,
    last_synced_at: row.last_synced_at,
    sync_status: row.sync_status as KernCollection['sync_status'],
    sync_error_message: row.sync_error_message,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    row_count: count,
  };
}

export function useCollections(): UseQueryResult<KernCollection[]> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['collections', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*, rows(count)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CollectionRow[];
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    select: (data) => data.map(mapRowToCollection),
  });
}

export function useCollection(slug: string): UseQueryResult<KernCollection | null> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['collection', slug, userId],
    queryFn: async (): Promise<KernCollection | null> => {
      const { data, error } = await supabase
        .from('collections')
        .select('*, rows(count)')
        .eq('slug', slug)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return mapRowToCollection(data as CollectionRow);
    },
    enabled: Boolean(userId) && Boolean(slug),
    staleTime: 60_000,
  });
}

export async function fetchCollectionById(collectionId: string): Promise<KernCollection | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*, rows(count)')
    .eq('id', collectionId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return mapRowToCollection(data as CollectionRow);
}

export function useCollectionById(id: string | null): UseQueryResult<KernCollection | null> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['collectionById', id, userId],
    queryFn: () => fetchCollectionById(id as string),
    enabled: Boolean(userId) && Boolean(id),
    staleTime: 60_000,
  });
}

export type CreateCollectionInput = {
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
};

export type UseCreateCollectionOptions = {
  /** When false, do not redirect after create (e.g. live source modal). Default true. */
  navigateOnSuccess?: boolean;
};

export function useCreateCollection(options?: UseCreateCollectionOptions) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const navigateOnSuccess = options?.navigateOnSuccess !== false;

  return useMutation({
    mutationFn: async (input: CreateCollectionInput) => {
      if (!userId) throw new Error('Not signed in');

      const { data: maxRow } = await supabase
        .from('collections')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSort = (maxRow?.sort_order ?? -1) + 1;

      const { data: created, error: insertErr } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: input.name,
          slug: input.slug,
          icon: input.icon,
          color: input.color,
          description: input.description,
          is_live_source: false,
          sort_order: nextSort,
        })
        .select('*')
        .single();

      if (insertErr) throw insertErr;
      if (!created) throw new Error('No collection returned');

      const { error: fieldErr } = await supabase.from('fields').insert({
        collection_id: created.id,
        user_id: userId,
        name: 'Name',
        slug: 'name',
        type: 'text',
        is_primary: true,
        sort_order: 0,
      });

      if (fieldErr) throw fieldErr;

      return { slug: created.slug, id: created.id };
    },
    onSuccess: (created) => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      if (navigateOnSuccess) navigate(`/c/${created.slug}`);
    },
    onError: (e) => toastMutationError(e),
  });
}

export type UpdateCollectionInput = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
};

export function useUpdateCollection() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, icon, color, description }: UpdateCollectionInput) => {
      const { error } = await supabase
        .from('collections')
        .update({ name, icon, color, description })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, vars) => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      void queryClient.invalidateQueries({ queryKey: ['collection', vars.slug, userId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export function useDeleteCollection() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
      navigate('/dashboard');
    },
    onError: (e) => toastMutationError(e),
  });
}

function toUpsertPayload(c: KernCollection, sort_order: number) {
  return {
    id: c.id,
    user_id: c.user_id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    color: c.color,
    description: c.description,
    is_live_source: c.is_live_source,
    live_source_type: c.live_source_type,
    live_source_config: c.live_source_config as Json | null,
    last_synced_at: c.last_synced_at,
    sync_status: c.sync_status,
    sync_error_message: c.sync_error_message,
    sort_order,
  };
}

export function useReorderCollections() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      if (!userId) throw new Error('Not signed in');
      const list = queryClient.getQueryData<KernCollection[]>(['collections', userId]);
      if (!list?.length) throw new Error('No collections in cache');

      const payload = updates.map(({ id, sort_order }) => {
        const c = list.find((x) => x.id === id);
        if (!c) throw new Error(`Missing collection ${id}`);
        return toUpsertPayload(c, sort_order);
      });

      const { error } = await supabase.from('collections').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onMutate: async (updates) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ['collections', userId] });
      const prev = queryClient.getQueryData<KernCollection[]>(['collections', userId]);
      if (!prev) return { prev };

      const next = prev
        .map((c) => {
          const u = updates.find((x) => x.id === c.id);
          return u ? { ...c, sort_order: u.sort_order } : c;
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      queryClient.setQueryData<KernCollection[]>(['collections', userId], next);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (userId && ctx?.prev) {
        queryClient.setQueryData(['collections', userId], ctx.prev);
      }
      toastMutationError(err);
    },
    onSettled: () => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: ['collections', userId] });
    },
  });
}
