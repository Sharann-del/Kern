create table public.fields (
  id                   uuid default gen_random_uuid() primary key,
  collection_id        uuid references public.collections(id) on delete cascade not null,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  name                 text not null,
  slug                 text not null,
  type                 text not null,
  options              jsonb,
  is_required          boolean not null default false,
  is_primary           boolean not null default false,
  is_hidden_by_default boolean not null default false,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  unique(collection_id, slug)
);
alter table public.fields enable row level security;
create policy "Users can manage own fields" on public.fields for all using (auth.uid() = user_id);
