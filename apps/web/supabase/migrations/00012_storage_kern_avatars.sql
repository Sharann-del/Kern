insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kern-avatars',
  'kern-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

create policy "kern_avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'kern-avatars');

create policy "kern_avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'kern-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "kern_avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'kern-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "kern_avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'kern-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
