create policy "members read meetmap" on storage.objects
  for select to authenticated using (bucket_id = 'meetmap');
create policy "members upload own meetmap files" on storage.objects
  for insert to authenticated with check (bucket_id = 'meetmap' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members update own meetmap files" on storage.objects
  for update to authenticated using (bucket_id = 'meetmap' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members delete own meetmap files" on storage.objects
  for delete to authenticated using (bucket_id = 'meetmap' and (storage.foldername(name))[1] = auth.uid()::text);