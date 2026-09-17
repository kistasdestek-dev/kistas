-- ============================================================================
-- SEC-013 & SEC-014: PROFILES PII HARDENING & STORAGE BUCKET RESTRICTION
-- ============================================================================

-- 1. DROP UNUSED LEGACY COLUMNS FROM public.profiles
-- Kıstas dijital proje vitrini modelinde IBAN ve TCKN saklanmaz.
-- Eski pazaryeri döneminden kalan boş kolonlar tamamen temizlenir.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS iban;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS identity_number;

-- 2. HARDEN RLS ON public.profiles
-- Anonim veya diğer kullanıcıların gelişigüzel tüm kullanıcı listesini dump etmesini engeller.
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;

CREATE POLICY "Profiles viewable by public and creators" ON public.profiles
FOR SELECT
USING (
    -- 1. Kullanıcı kendi profilini her zaman görebilir
    id = auth.uid()
    OR
    -- 2. Platform yöneticisi görebilir
    public.is_platform_admin()
    OR
    -- 3. Anonim/Diğer kullanıcılar yalnızca aktif projesi olan yaratıcıları ve doğrulanmış yayıncıları görebilir (ve engellenmemiş olmalıdır)
    (
        (
            is_verified = TRUE
            OR EXISTS (
                SELECT 1 FROM public.listings 
                WHERE seller_id = profiles.id AND status = 'active'
            )
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users 
            WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
               OR (blocker_id = profiles.id AND blocked_id = auth.uid())
        )
    )
);

-- 3. COLUMN-LEVEL PRIVILEGES (CLS) ON public.profiles
-- Anonim (anon) rolü select=* yapsa dahi PostgREST yalnızca izin verilen vitrin kolonlarını döner.
-- phone, fcm_token, available_balance, pending_balance vb. anon rolüne kesinlikle ifşa edilmez.
REVOKE SELECT ON public.profiles FROM public, anon, authenticated;

-- Anonim rolü için salt vitrin kolonları:
GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    created_at,
    updated_at
) ON public.profiles TO anon;

-- Giriş yapmış kullanıcılar için:
GRANT SELECT (
    id,
    full_name,
    avatar_url,
    bio,
    city,
    district,
    rating_average,
    rating_count,
    is_verified,
    phone,
    boost_credits,
    created_at,
    updated_at
) ON public.profiles TO authenticated;

-- 4. HARDEN STORAGE (storage.objects)
-- Anonim dosya yükleme (spam/deface) politikasını tamamen engelle.
-- Yalnızca oturum açmış (authenticated) kullanıcılar 'kistas' kovasına yükleme yapabilir.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;

    CREATE POLICY "Authenticated users can upload to kistas"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
    );

    CREATE POLICY "Users can delete own objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'kistas'
        AND (owner = auth.uid() OR public.is_platform_admin())
    );
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

