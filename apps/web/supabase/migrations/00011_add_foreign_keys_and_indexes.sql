-- FK from views to custom_views_registry (needs both tables to exist)
alter table public.views add constraint views_custom_view_id_fkey
  foreign key (custom_view_id) references public.custom_views_registry(id) on delete set null;

-- Unique constraint on rows for live source upserts
create unique index rows_collection_external_id_unique 
  on public.rows(collection_id, external_id) 
  where external_id is not null;

-- Performance indexes
create index rows_collection_id_user_id_idx on public.rows(collection_id, user_id);
create index rows_created_at_idx on public.rows(created_at desc);
create index rows_data_gin_idx on public.rows using gin(data);
create index fields_collection_id_idx on public.fields(collection_id);
create index fields_sort_order_idx on public.fields(collection_id, sort_order);
create index views_collection_id_idx on public.views(collection_id);
create index row_relations_source_idx on public.row_relations(source_row_id);
create index row_relations_target_idx on public.row_relations(target_row_id);
create index row_relations_field_idx on public.row_relations(field_id);
create index collections_user_id_idx on public.collections(user_id);
create index collections_sort_order_idx on public.collections(user_id, sort_order);

-- Utility function for row counts
create or replace function public.get_collection_row_count(p_collection_id uuid)
returns bigint language sql security definer as $$
  select count(*) from public.rows where collection_id = p_collection_id and user_id = auth.uid();
$$;

-- RPC to remove a field slug from all rows in a collection (used when deleting a field)
create or replace function public.remove_field_from_rows(p_collection_id uuid, p_field_slug text)
returns void language sql security definer as $$
  update public.rows set data = data - p_field_slug where collection_id = p_collection_id;
$$;
