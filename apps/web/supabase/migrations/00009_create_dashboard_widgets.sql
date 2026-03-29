create table public.dashboard_widgets (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  type       text not null,
  title      text,
  config     jsonb not null default '{}',
  position_x integer not null,
  position_y integer not null,
  width      integer not null default 2,
  height     integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dashboard_widgets enable row level security;
create policy "Users can manage own widgets" on public.dashboard_widgets for all using (auth.uid() = user_id);
