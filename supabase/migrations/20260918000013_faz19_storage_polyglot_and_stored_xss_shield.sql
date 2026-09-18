-- ============================================================================
-- 20260918000013_faz19_storage_polyglot_and_stored_xss_shield.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19 / AŞAMA 5
-- DEPOLAMA POLYGLOT DOSYA & STORED XSS KALKANI (STORAGE POISONING & PATH TRAVERSAL SHIELD)
-- ============================================================================

-- 1. BUCKET METAVERİSİNDE İZİNLİ MIME LİSTESİNİ VE TAVAN BOYUTU MÜHÜRLE
UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
    file_size_limit = 10485760 -- 10 MB tavan
WHERE id = 'kistas';

-- 2. STORAGE.OBJECTS İÇİN SIKIŞTIRILMIŞ INSERT POLİTİKASI (POLYGLOT, XSS & PATH TRAVERSAL ENGELİ)
DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload project images" ON storage.objects;

CREATE POLICY "object_write_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kistas'
    AND auth.role() = 'authenticated'
    -- 1. Path Traversal Engeli (Kesinlikle '..' içeremez)
    AND name !~ '\.\.'
    -- 2. Güvenli Karakter Seti
    AND name ~ '^[a-zA-Z0-9_\-\./]+$'
    -- 3. Uzantı Beyaz Listesi (SVG, XML, HTML, PHP, JS, EXE KESİNLİKLE YASAK)
    AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    -- 4. MIME Tipi Doğrulaması (Eğer metadata sağlandıysa)
    AND (
        metadata IS NULL 
        OR (metadata->>'mimetype') IS NULL
        OR (metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp')
    )
    -- 5. Sahiplik İzolasyonu (Yükleyen kişi nesnenin sahibi olmak zorundadır)
    AND (owner IS NULL OR owner = auth.uid())
);

-- 3. STORAGE.OBJECTS İÇİN SIKIŞTIRILMIŞ UPDATE POLİTİKASI
DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;

CREATE POLICY "object_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'kistas'
    AND (owner = auth.uid() OR public.is_platform_admin())
)
WITH CHECK (
    bucket_id = 'kistas'
    AND (owner = auth.uid() OR public.is_platform_admin())
    AND name !~ '\.\.'
    AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
);
