import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Json } from '@/types/database';
import type {
  FieldOptions,
  FieldType,
  KernField,
} from '@/types/kern';
import { slugify } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

type FieldRow = {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  slug: string;
  type: string;
  options: Json | null;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
  created_at: string;
};

function parseOptions(type: FieldType, raw: Json | null): FieldOptions {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  switch (type) {
    case 'select':
    case 'multi_select':
      return raw as FieldOptions;
    case 'number':
      return raw as FieldOptions;
    case 'relation':
      return raw as FieldOptions;
    case 'file':
      return raw as FieldOptions;
    default:
      return null;
  }
}

function mapRowToKernField(row: FieldRow): KernField {
  const type = row.type as FieldType;
  return {
    id: row.id,
    collection_id: row.collection_id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    type,
    options: parseOptions(type, row.options),
    is_required: row.is_required,
    is_primary: row.is_primary,
    is_hidden_by_default: row.is_hidden_by_default,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export async function fetchFieldsForCollection(collectionId: string): Promise<KernField[]> {
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FieldRow[]).map(mapRowToKernField);
}

export function useFields(collectionId: string): UseQueryResult<KernField[]> {
  return useQuery({
    queryKey: ['fields', collectionId],
    queryFn: () => fetchFieldsForCollection(collectionId),
    enabled: Boolean(collectionId),
    staleTime: 120_000,
  });
}

async function nextUniqueFieldSlug(collectionId: string, name: string): Promise<string> {
  const base = slugify(name) || 'field';
  const { data: rows, error } = await supabase
    .from('fields')
    .select('slug')
    .eq('collection_id', collectionId);
  if (error) throw error;
  const taken = new Set((rows ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export type CreateFieldInput = {
  collectionId: string;
  name: string;
  type: FieldType;
  options?: FieldOptions;
  isRequired?: boolean;
  /** When set, new field gets this `sort_order` and existing fields at or above it shift up by 1. */
  insertAtSortOrder?: number;
};

export function useCreateField() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      name,
      type,
      options,
      isRequired,
      insertAtSortOrder,
    }: CreateFieldInput) => {
      if (!userId) throw new Error('Not signed in');

      let sort_order: number;
      if (insertAtSortOrder !== undefined) {
        const { data: toShift, error: shiftErr } = await supabase
          .from('fields')
          .select('id, sort_order')
          .eq('collection_id', collectionId)
          .gte('sort_order', insertAtSortOrder);
        if (shiftErr) throw shiftErr;
        const sorted = [...(toShift ?? [])].sort((a, b) => b.sort_order - a.sort_order);
        for (const r of sorted) {
          const { error: uerr } = await supabase
            .from('fields')
            .update({ sort_order: r.sort_order + 1 })
            .eq('id', r.id);
          if (uerr) throw uerr;
        }
        sort_order = insertAtSortOrder;
      } else {
        const { data: maxRow, error: maxErr } = await supabase
          .from('fields')
          .select('sort_order')
          .eq('collection_id', collectionId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (maxErr) throw maxErr;
        sort_order = (maxRow?.sort_order ?? -1) + 1;
      }

      const slug = await nextUniqueFieldSlug(collectionId, name);

      const { error } = await supabase.from('fields').insert({
        collection_id: collectionId,
        user_id: userId,
        name: name.trim(),
        slug,
        type,
        options: options === null || options === undefined ? null : (options as unknown as Json),
        is_required: Boolean(isRequired),
        is_primary: false,
        is_hidden_by_default: false,
        sort_order,
      });
      if (error) throw error;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['fields', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type UpdateFieldInput = {
  id: string;
  collectionId: string;
  name?: string;
  options?: FieldOptions;
  isRequired?: boolean;
  isHiddenByDefault?: boolean;
};

export function useUpdateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      options,
      isRequired,
      isHiddenByDefault,
    }: UpdateFieldInput) => {
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name.trim();
      if (options !== undefined) patch.options = options === null ? null : (options as unknown as Json);
      if (isRequired !== undefined) patch.is_required = isRequired;
      if (isHiddenByDefault !== undefined) patch.is_hidden_by_default = isHiddenByDefault;

      if (Object.keys(patch).length === 0) return;

      const { error } = await supabase.from('fields').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['fields', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type DeleteFieldInput = {
  id: string;
  collectionId: string;
  slug: string;
};

export function useDeleteField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, collectionId, slug }: DeleteFieldInput) => {
      const { error: delErr } = await supabase.from('fields').delete().eq('id', id);
      if (delErr) throw delErr;

      const { error: rpcErr } = await supabase.rpc('remove_field_from_rows', {
        p_collection_id: collectionId,
        p_field_slug: slug,
      });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['fields', collectionId] });
      void queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

function toFieldUpsertPayload(f: KernField, sort_order: number) {
  return {
    id: f.id,
    collection_id: f.collection_id,
    user_id: f.user_id,
    name: f.name,
    slug: f.slug,
    type: f.type,
    options: f.options === null ? null : (f.options as unknown as Json),
    is_required: f.is_required,
    is_primary: f.is_primary,
    is_hidden_by_default: f.is_hidden_by_default,
    sort_order,
    created_at: f.created_at,
  };
}

export function useReorderFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      updates,
    }: {
      collectionId: string;
      updates: { id: string; sort_order: number }[];
    }) => {
      const list = queryClient.getQueryData<KernField[]>(['fields', collectionId]);
      if (!list?.length) throw new Error('No fields in cache');

      const payload = updates.map(({ id, sort_order }) => {
        const f = list.find((x) => x.id === id);
        if (!f) throw new Error(`Missing field ${id}`);
        return toFieldUpsertPayload(f, sort_order);
      });

      const { error } = await supabase.from('fields').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
    },
    onMutate: async ({ collectionId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['fields', collectionId] });
      const prev = queryClient.getQueryData<KernField[]>(['fields', collectionId]);
      if (!prev) return { prev };

      const next = prev
        .map((f) => {
          const u = updates.find((x) => x.id === f.id);
          return u ? { ...f, sort_order: u.sort_order } : f;
        })
        .sort((a, b) => a.sort_order - b.sort_order);

      queryClient.setQueryData<KernField[]>(['fields', collectionId], next);
      return { prev };
    },
    onError: (err, { collectionId }, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['fields', collectionId], ctx.prev);
      }
      toastMutationError(err);
    },
    onSettled: (_d, _e, vars) => {
      if (vars?.collectionId) {
        void queryClient.invalidateQueries({ queryKey: ['fields', vars.collectionId] });
      }
    },
  });
}

export function useSetPrimaryField() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, fieldId }: { collectionId: string; fieldId: string }) => {
      if (!userId) throw new Error('Not signed in');
      const { error: e1 } = await supabase
        .from('fields')
        .update({ is_primary: false })
        .eq('collection_id', collectionId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('fields').update({ is_primary: true }).eq('id', fieldId);
      if (e2) throw e2;
    },
    onSuccess: (_void, { collectionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['fields', collectionId] });
    },
    onError: (e) => toastMutationError(e),
  });
}
