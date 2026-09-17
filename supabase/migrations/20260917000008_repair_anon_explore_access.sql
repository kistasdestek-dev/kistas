-- ==============================================================================
-- KISTAS SAVUNMA HATTI: GUEST/ANON KEŞFET ERİŞİMİ VE İZİN ONARIMI (SEC-022)
-- ==============================================================================
-- Açıklama:
-- 1. `is_platform_admin()` fonksiyonu RLS politikalarında çağrıldığından anon rolünün
--    SELECT esnasında 42501 (permission denied for function is_platform_admin) almasını
--    engellemek için anon rolüne EXECUTE yetkisi tanımlanır. (auth.uid() NULL olduğu için daima güvenle FALSE döner).
-- 2. `listings` tablosunda anon ve authenticated rolleri için RLS SELECT politikaları
--    ayrıştırılır: Anon kullanıcılar doğrudan `status = 'active'` projeleri sıfır gecikmeyle okur.
-- 3. `profiles` RLS SELECT politikasındaki `blocked_users` alt sorgusu, güvenli
--    SECURITY DEFINER `is_user_blocked(auth.uid(), profiles.id)` ile değiştirilir; böylece
--    anon rolünün `blocked_users` tablosuna erişim hatası alması kalıcı olarak engellenir.
-- ==============================================================================

-- 1. IS_PLATFORM_ADMIN FONKSİYONUNA ANON VE AUTHENTICATED İZNİ
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated;

-- 2. LISTINGS TABLOSUNDA AYRI GUEST VE AUTHENTICATED OKUMA POLİTİKALARI
DROP POLICY IF EXISTS "listings_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_anon_read_policy" ON public.listings;
DROP POLICY IF EXISTS "listings_authenticated_read_policy" ON public.listings;
DROP POLICY IF EXISTS "Public listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by non-blocked users" ON public.listings;

-- Anonim Ziyaretçiler: Sadece aktif projeleri doğrudan ve ultra-hızlı okur
CREATE POLICY "listings_anon_read_policy" ON public.listings
    FOR SELECT TO anon
    USING (status = 'active');

-- Giriş Yapmış Kullanıcılar: Aktif projeler (engellenmemiş olanlar), kendi projeleri veya admin
CREATE POLICY "listings_authenticated_read_policy" ON public.listings
    FOR SELECT TO authenticated
    USING (
        (status = 'active' AND NOT public.is_user_blocked(auth.uid(), listings.seller_id))
        OR seller_id = auth.uid()
        OR public.is_platform_admin()
    );

-- 3. PROFILES TABLOSU RLS GÜNCELLEMESİ (ANON ERİŞİMİ VE GÜVENLİ BLOK KONTROLÜ)
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles viewable by public and creators" ON public.profiles
FOR SELECT
TO authenticated, anon
USING (
    -- 1. Kullanıcı kendi profilini her zaman görebilir
    (auth.uid() IS NOT NULL AND id = auth.uid())
    OR
    -- 2. Platform yöneticisi görebilir
    (auth.uid() IS NOT NULL AND public.is_platform_admin())
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
        AND NOT public.is_user_blocked(auth.uid(), profiles.id)
    )
);
