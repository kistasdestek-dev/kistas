-- ============================================================================
-- FAZ 17 / AŞAMA 2: DEPOLAMA (STORAGE) İZOLASYONU & FOOTHOLD TEMİZLİĞİ (PARSRAPOR V2)
-- ============================================================================
-- PARS DevState Bulgusu V2:
-- Anonim dosya yükleme açığı kanıtlandı; kistas kovasına 7 adet test/beacon dosyası
-- yüklendi ve DELETE kısıtlı olduğu için bu dosyalar silinemez kalıcı ayak izi oldu.
-- Bu migration ile:
-- 1. storage.objects üzerindeki anonim INSERT izinleri tamamen mühürlenir.
-- 2. Yalnızca authenticated rolü kistas kovasına izinli resim formatlarında yükleyebilir.
-- 3. Nesne sahibi (owner = auth.uid()) ve platform yöneticisi için DELETE/UPDATE hakkı tanınır.
-- 4. Pentest esnasında bırakılan 7 adet test dosyası temizlenir.

DO $$
BEGIN
    -- 1. ESKİ VE GEVŞEK POLİTİKALARI TEMİZLE
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "anon_insert" ON storage.objects;
    DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;
    DROP POLICY IF EXISTS "object_delete_owner" ON storage.objects;
    DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;
    DROP POLICY IF EXISTS "object_read_public" ON storage.objects;

    -- 2. PUBLIC READ POLİTİKASI (Vitrin görselleri okunabilir)
    CREATE POLICY "object_read_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'kistas');

    -- 3. SIKIŞTIRILMIŞ AUTHENTICATED INSERT POLİTİKASI
    CREATE POLICY "object_write_authenticated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
        AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    );

    -- 4. SAHİP VE ADMİN DELETE / UPDATE POLİTİKASI
    CREATE POLICY "object_delete_owner"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'kistas'
        AND (owner = auth.uid() OR public.is_platform_admin())
    );

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
    );

    BEGIN
        PERFORM set_config('storage.allow_delete', 'true', true);
        DELETE FROM storage.objects
        WHERE bucket_id = 'kistas'
          AND name IN (
            'pars_foothold_beacon.png',
            'pars_test.png',
            'pars_test_authed.png',
            'pars_postpatch_test.png',
            'pars_still_open.png',
            'final_check.png',
            'hardening_probe_1789681500.png'
          );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'storage.objects silme koruması devreye girdi: %', SQLERRM;
    END;

EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
