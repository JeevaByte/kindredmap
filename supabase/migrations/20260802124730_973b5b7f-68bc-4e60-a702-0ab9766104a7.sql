DROP POLICY IF EXISTS "members read meetmap" ON storage.objects;

CREATE POLICY "own files read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'meetmap' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "members read avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'meetmap' AND (storage.foldername(name))[2] = 'avatars');

CREATE POLICY "participants read meet photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'meetmap'
  AND (storage.foldername(name))[2] = 'meets'
  AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.photo_url = storage.objects.name
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
  )
);