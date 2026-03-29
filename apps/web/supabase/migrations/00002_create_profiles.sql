create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  preferences jsonb not null default '{"theme":"light","sidebar_collapsed":false}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view and edit own profile" on public.profiles for all using (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
