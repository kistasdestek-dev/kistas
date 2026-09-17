-- ============================================================================
-- SEC-015: ONBOARDING REPAIR, STORAGE HARDENING & ANONYMOUS ACCESS SHUTDOWN
-- ============================================================================

-- 1. PROFILES TABLOSU: ONBOARDING ONARIMI & SIKIŞTIRILMIŞ İZİNLER
-- Yeni kayıt olan kullanıcıların (authenticated) kendi profil satırını oluşturabilmesi
-- ve sadece izin verilen alanları güncelleyebilmesi sağlanır.

-- 1.1 RLS Politikalarını Yenile
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 1.2 Kolon Düzeyinde İzinler (CLS)
-- Bakiye, kredi ve doğrulama kolonları (boost_credits, available_balance, is_verified)
-- istemci tarafından doğrudan INSERT/UPDATE yapılamaz; yalnızca sunucu RPC'leri güncelleyebilir.
REVOKE INSERT, UPDATE ON public.profiles FROM public, anon, authenticated;

GRANT INSERT (
    id,
    full_name,
    avatar_url
) ON public.profiles TO authenticated;

GRANT UPDATE (
    full_name,
    avatar_url,
    bio,
    city,
    district,
    fcm_token,
    updated_at
) ON public.profiles TO authenticated;

-- SELECT haklarını teyit et
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


-- 2. STORAGE (storage.objects): ANONİM YÜKLEME ENGELİ & TEMİZLİK
-- Anonim dosya yükleme açıklarını tamamen kapatır; yalnızca authenticated kullanıcılara izin verir.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "anon_insert" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;

    CREATE POLICY "Authenticated users can upload to kistas"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
        AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp', 'gif')
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


-- 3. 10 HASSAS TABLOYU ANONİM ROLDEN (anon) TAMAMEN ARINDIRMA
-- Kamuya açık olmayan hassas tablolara anonim rolün doğrudan erişmesi engellenir.
-- Bu sayede saldırganlar boş sorgu (HTTP 200) dahi atamaz; doğrudan HTTP 401/403 duvarına çarpar.

DO $$
BEGIN
    -- orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        REVOKE ALL ON TABLE public.orders FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated, service_role;
    END IF;

    -- user_addresses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_addresses') THEN
        REVOKE ALL ON TABLE public.user_addresses FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_addresses TO authenticated, service_role;
    END IF;

    -- credit_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
        REVOKE ALL ON TABLE public.credit_transactions FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_transactions TO authenticated, service_role;
    END IF;

    -- conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
        REVOKE ALL ON TABLE public.conversations FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversations TO authenticated, service_role;
    END IF;

    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        REVOKE ALL ON TABLE public.messages FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated, service_role;
    END IF;

    -- reports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
        REVOKE ALL ON TABLE public.reports FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated, service_role;
    END IF;

    -- blocked_users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocked_users') THEN
        REVOKE ALL ON TABLE public.blocked_users FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blocked_users TO authenticated, service_role;
    END IF;

    -- user_consents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_consents') THEN
        REVOKE ALL ON TABLE public.user_consents FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_consents TO authenticated, service_role;
    END IF;

    -- disputes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disputes') THEN
        REVOKE ALL ON TABLE public.disputes FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.disputes TO authenticated, service_role;
    END IF;

    -- offers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offers') THEN
        REVOKE ALL ON TABLE public.offers FROM anon, public;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.offers TO authenticated, service_role;
    END IF;
END $$;
