create table public.rows (
  id            uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  data          jsonb not null default '{}',
  external_id   text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.rows enable row level security;
create policy "Users can manage own rows" on public.rows for all using (auth.uid() = user_id);
create trigger rows_updated_at before update on public.rows for each row execute procedure public.handle_updated_at();
