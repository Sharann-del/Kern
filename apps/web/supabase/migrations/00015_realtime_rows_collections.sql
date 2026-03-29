-- Broadcast row and collection changes to Supabase Realtime clients (RLS still applies).
alter publication supabase_realtime add table public.rows;
alter publication supabase_realtime add table public.collections;
