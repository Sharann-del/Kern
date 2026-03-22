create table public.views (
  id            uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  name          text not null,
  type          text not null,
  config        jsonb not null default '{"hidden_fields":[],"filters":[],"sorts":[],"group_by_field":null,"calendar_date_field":null,"gallery_cover_field":null,"gallery_card_fields":[],"table_column_widths":{},"kanban_collapsed_columns":[]}',
  custom_view_id uuid,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.views enable row level security;
create policy "Users can manage own views" on public.views for all using (auth.uid() = user_id);
create trigger views_updated_at before update on public.views for each row execute procedure public.handle_updated_at();
