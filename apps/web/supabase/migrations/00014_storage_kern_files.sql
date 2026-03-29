-- Private row attachments (kern-avatars bucket + policies live in 00012_storage_kern_avatars.sql)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kern-files', 'kern-files', false, 52428800, null)
on conflict (id) do nothing;

create policy "Users can upload own files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'kern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'kern-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
