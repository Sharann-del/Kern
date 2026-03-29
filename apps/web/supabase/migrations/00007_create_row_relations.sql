create table public.row_relations (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  source_row_id  uuid references public.rows(id) on delete cascade not null,
  target_row_id  uuid references public.rows(id) on delete cascade not null,
  field_id       uuid references public.fields(id) on delete cascade not null,
  created_at     timestamptz not null default now(),
  unique(source_row_id, target_row_id, field_id)
);
alter table public.row_relations enable row level security;
create policy "Users can manage own row relations" on public.row_relations for all using (auth.uid() = user_id);
