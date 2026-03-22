create table public.custom_views_registry (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  name           text not null,
  description    text,
  code           text not null,
  compiled_code  text,
  is_published   boolean not null default false,
  published_slug text unique,
  thumbnail_url  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.custom_views_registry enable row level security;
create policy "Users can manage own custom views" on public.custom_views_registry for all using (auth.uid() = user_id);
create policy "Published views are public" on public.custom_views_registry for select using (is_published = true);
