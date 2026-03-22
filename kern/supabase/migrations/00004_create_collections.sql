create table public.collections (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  name                text not null,
  slug                text not null,
  icon                text,
  color               text,
  description         text,
  is_live_source      boolean not null default false,
  live_source_type    text,
  live_source_config  jsonb,
  last_synced_at      timestamptz,
  sync_status         text not null default 'idle',
  sync_error_message  text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(user_id, slug)
);
alter table public.collections enable row level security;
create policy "Users can manage own collections" on public.collections for all using (auth.uid() = user_id);
create trigger collections_updated_at before update on public.collections for each row execute procedure public.handle_updated_at();
