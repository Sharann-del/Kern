import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Json } from '@/types/database';
import type {
  FieldOptions,
  FieldType,
  KernField,
  KernRow,
  KernRowRelation,
} from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

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

type RelationRowWithTarget = {
  id: string;
  field_id: string;
  source_row_id: string;
  target_row_id: string;
  user_id: string;
  created_at: string;
  target_row: RowDb | null;
};

export type RelationEntry = {
  relationId: string;
  row: KernRow;
};

function groupRelationsByFieldId(rows: RelationRowWithTarget[]): Record<string, RelationEntry[]> {
  const out: Record<string, RelationEntry[]> = {};
  for (const r of rows) {
    if (!r.target_row) continue;
    const list = out[r.field_id] ?? (out[r.field_id] = []);
    list.push({ relationId: r.id, row: mapRowToKernRow(r.target_row) });
  }
  return out;
}

export function useRelations(rowId: string, fields: KernField[]) {
  const relationFields = fields.filter((f) => f.type === 'relation');
  const hasRelations = relationFields.length > 0;

  const query = useQuery({
    queryKey: ['relations', rowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('row_relations')
        .select(
          `
          id,
          field_id,
          source_row_id,
          target_row_id,
          user_id,
          created_at,
          target_row:rows!row_relations_target_row_id_fkey (
            id,
            collection_id,
            user_id,
            data,
            external_id,
            sort_order,
            created_at,
            updated_at
          )
        `
        )
        .eq('source_row_id', rowId);
      if (error) throw error;
      return (data ?? []) as RelationRowWithTarget[];
    },
    enabled: Boolean(rowId) && hasRelations,
    staleTime: 30_000,
    select: (rows) => groupRelationsByFieldId(rows),
  });

  return {
    ...query,
    data: hasRelations ? (query.data ?? {}) : {},
  };
}

export type AddRelationInput = {
  sourceRowId: string;
  targetRowId: string;
  fieldId: string;
};

export function useAddRelation() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceRowId, targetRowId, fieldId }: AddRelationInput) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase.from('row_relations').insert({
        source_row_id: sourceRowId,
        target_row_id: targetRowId,
        field_id: fieldId,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_void, { sourceRowId, targetRowId }) => {
      void queryClient.invalidateQueries({ queryKey: ['relations', sourceRowId] });
      void queryClient.invalidateQueries({ queryKey: ['reversed-relations', targetRowId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export type RemoveRelationInput = {
  id: string;
  sourceRowId: string;
};

export function useRemoveRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sourceRowId }: RemoveRelationInput) => {
      const { data: rel, error: fe } = await supabase
        .from('row_relations')
        .select('target_row_id')
        .eq('id', id)
        .single();
      if (fe) throw fe;
      const { error } = await supabase.from('row_relations').delete().eq('id', id);
      if (error) throw error;
      return { sourceRowId, targetRowId: rel?.target_row_id as string | undefined };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['relations', result.sourceRowId] });
      if (result.targetRowId) {
        void queryClient.invalidateQueries({ queryKey: ['reversed-relations', result.targetRowId] });
      }
    },
    onError: (e) => toastMutationError(e),
  });
}

type FieldEmbedRow = {
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

function parseFieldOptions(type: FieldType, raw: Json | null): FieldOptions {
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

function mapEmbeddedField(row: FieldEmbedRow): KernField {
  const type = row.type as FieldType;
  return {
    id: row.id,
    collection_id: row.collection_id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    type,
    options: parseFieldOptions(type, row.options),
    is_required: row.is_required,
    is_primary: row.is_primary,
    is_hidden_by_default: row.is_hidden_by_default,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

type ReversedRow = {
  id: string;
  field_id: string;
  source_row_id: string;
  target_row_id: string;
  user_id: string;
  created_at: string;
  source_row: RowDb | null;
  field: FieldEmbedRow | null;
};

export type ReversedRelationItem = {
  relation: KernRowRelation;
  sourceRow: KernRow;
  field: KernField;
};

export function useReversedRelations(rowId: string) {
  return useQuery({
    queryKey: ['reversed-relations', rowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('row_relations')
        .select(
          `
          id,
          field_id,
          source_row_id,
          target_row_id,
          user_id,
          created_at,
          source_row:rows!row_relations_source_row_id_fkey (
            id,
            collection_id,
            user_id,
            data,
            external_id,
            sort_order,
            created_at,
            updated_at
          ),
          field:fields!row_relations_field_id_fkey (
            id,
            collection_id,
            user_id,
            name,
            slug,
            type,
            options,
            is_required,
            is_primary,
            is_hidden_by_default,
            sort_order,
            created_at
          )
        `
        )
        .eq('target_row_id', rowId);
      if (error) throw error;
      const rows = (data ?? []) as ReversedRow[];
      const out: ReversedRelationItem[] = [];
      for (const r of rows) {
        if (!r.source_row || !r.field) continue;
        out.push({
          relation: {
            id: r.id,
            user_id: r.user_id,
            source_row_id: r.source_row_id,
            target_row_id: r.target_row_id,
            field_id: r.field_id,
            created_at: r.created_at,
          },
          sourceRow: mapRowToKernRow(r.source_row),
          field: mapEmbeddedField(r.field),
        });
      }
      return out;
    },
    enabled: Boolean(rowId),
    staleTime: 30_000,
  });
}
