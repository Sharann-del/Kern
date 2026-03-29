import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toastMutationError } from '@/lib/toast-errors';
import type { Database, Json } from '@/types/database';
import type { DashboardWidget, DashboardWidgetType } from '@/types/kern';
import { useAuth } from '@/providers/AuthProvider';

type DashboardWidgetRow = Database['public']['Tables']['dashboard_widgets']['Row'];

function mapDbToWidget(row: DashboardWidgetRow): DashboardWidget {
  const raw = row.config;
  const config =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type as DashboardWidgetType,
    title: row.title,
    config,
    position_x: row.position_x,
    position_y: row.position_y,
    width: row.width,
    height: row.height,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type CreateDashboardWidgetInput = Omit<
  DashboardWidget,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export type UpdateDashboardWidgetInput = {
  id: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  config?: Record<string, unknown>;
  title?: string | null;
};

export function useWidgets(): UseQueryResult<DashboardWidget[]> {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['widgets', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DashboardWidgetRow[];
    },
    enabled: Boolean(userId),
    select: (rows) => rows.map(mapDbToWidget),
  });
}

export function useCreateWidget() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDashboardWidgetInput) => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          user_id: userId,
          type: input.type,
          title: input.title,
          config: input.config as Json,
          position_x: input.position_x,
          position_y: input.position_y,
          width: input.width,
          height: input.height,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapDbToWidget(data as DashboardWidgetRow);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['widgets', userId] });
    },
  });
}

export function useUpdateWidget() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateDashboardWidgetInput) => {
      const row: Database['public']['Tables']['dashboard_widgets']['Update'] = {};
      if (patch.position_x !== undefined) row.position_x = patch.position_x;
      if (patch.position_y !== undefined) row.position_y = patch.position_y;
      if (patch.width !== undefined) row.width = patch.width;
      if (patch.height !== undefined) row.height = patch.height;
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.config !== undefined) row.config = patch.config as Json;
      const { error } = await supabase.from('dashboard_widgets').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['widgets', userId] });
    },
    onError: (e) => toastMutationError(e),
  });
}

export function useDeleteWidget() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('dashboard_widgets').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['widgets', userId] });
      const previous = queryClient.getQueryData<DashboardWidget[]>(['widgets', userId]);
      queryClient.setQueryData<DashboardWidget[]>(['widgets', userId], (old) =>
        (old ?? []).filter((w) => w.id !== id)
      );
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['widgets', userId], ctx.previous);
      }
      toastMutationError(e);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['widgets', userId] });
    },
  });
}
