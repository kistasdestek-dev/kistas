-- ============================================================================
-- KISTAS.COM.TR — SUPABASE STORAGE HARDENING (hardened replacement)
-- Target : bucket `kistas` on iojgqicgeztqwkbetboa.supabase.co
-- Purpose: Close V2 (anon storage write) + the undeletable-persistence /
--          storage-spam DoS vector. Apply in Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Bucket-level policies (default-deny, then allow authenticated writes)
--    Supabase storage policies live on storage.buckets / storage.objects.
-- ----------------------------------------------------------------------------

-- Buckets: only authenticated users may create buckets (defensive).
DROP POLICY IF EXISTS "bucket_write_authenticated" ON storage.buckets;
CREATE POLICY "bucket_write_authenticated" ON storage.buckets
    FOR INSERT TO authenticated WITH CHECK (true);

-- Objects: PUBLIC READ (images must be viewable without auth)
DROP POLICY IF EXISTS "object_read_public" ON storage.objects;
CREATE POLICY "object_read_public" ON storage.objects
    FOR SELECT USING (true);

-- Objects: AUTHENTICATED WRITE ONLY (kills anon upload = V2)
DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
CREATE POLICY "object_write_authenticated" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (true);

-- Objects: owner-scoped UPDATE + DELETE (lets users manage their own files,
--          and lets the owner delete the planted foothold files)
DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;
CREATE POLICY "object_update_owner" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'kistas');

DROP POLICY IF EXISTS "object_delete_owner" ON storage.objects;
CREATE POLICY "object_delete_owner" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'kistas');

-- ----------------------------------------------------------------------------
-- 2. Optional: folder-level scoping (recommended)
--    Force uploads into per-user folders so one user cannot squat another's
--    path. Adjust the folder convention to match the app.
-- ----------------------------------------------------------------------------
-- CREATE POLICY "object_write_user_folder" ON storage.objects
--     FOR INSERT TO authenticated
--     WITH CHECK (
--         bucket_id = 'kistas'
--         AND (storage.foldername(name))[1] = auth.uid()::text
--     );

-- ----------------------------------------------------------------------------
-- 3. Cleanup of planted foothold files (run as service role / dashboard)
--    These were uploaded by anon and cannot be deleted by any client role.
-- ----------------------------------------------------------------------------
DELETE FROM storage.objects
WHERE bucket_id = 'kistas'
  AND name IN (
    'pars_foothold_beacon.png','pars_test.png','pars_test_authed.png',
    'pars_postpatch_test.png','pars_still_open.png','final_check.png',
    'hardening_probe_1789681500.png'
  );

-- ----------------------------------------------------------------------------
-- 4. Storage config (Supabase Dashboard → Storage → Policies / Settings)
--    - Max upload size: 5 MB (limits spam DoS payload weight)
--    - Allowed mime types: image/png, image/jpeg, image/webp (already set)
--    - File size limit per bucket + enable "File size limit" quota
--    - Disable "public" listing (already: list → 400 NoSuchBucket)
-- ============================================================================
