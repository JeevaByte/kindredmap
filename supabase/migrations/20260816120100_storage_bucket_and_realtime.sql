-- Make the schema reproducible from scratch.
--
-- Two pieces of required infrastructure only ever existed as Supabase dashboard
-- state, never as SQL:
--
--   * the 'meetmap' storage bucket. Four migrations declare policies against
--     `bucket_id = 'meetmap'`, but nothing ever creates the bucket, so a fresh
--     `supabase db reset` yields an app where every avatar upload 404s.
--
--   * the realtime publication for public.connections. The Network screen
--     subscribes to postgres_changes on that table, but the table was never
--     added to the supabase_realtime publication, so the subscription silently
--     delivers nothing. (The window-focus refetch masks this in practice.)
--
-- Both statements below are idempotent and safe to run against the existing
-- hosted project, where these objects may already exist.

-- 1. Private storage bucket for avatars and meet photos.
--    Private because every read is brokered through a signed URL
--    (useStoredUrl -> createSignedUrl) and gated by the policies above.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meetmap',
  'meetmap',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Realtime for connections, so a confirmation lands on the other person's
--    Network screen without waiting for a window-focus refetch.
--    REPLICA IDENTITY FULL so UPDATE payloads carry the old row too.
alter table public.connections replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'connections'
  ) then
    alter publication supabase_realtime add table public.connections;
  end if;
end;
$$;
