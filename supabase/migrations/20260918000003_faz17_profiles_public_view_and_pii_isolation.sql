-- ============================================================================
-- FAZ 17 / AŞAMA 3: PROFİL PII İZOLASYONU & PROFILES_PUBLIC GÖRÜNÜMÜ (PARSRAPOR V1, V1r, V6, B11)
-- ============================================================================
-- PARS DevState Bulgusu V1 & V1r:
-- profiles tablosunda hassas kolonlar kapatılmış olsa da anonim role 'id' dahil 11 kolon
-- açık bırakılmıştı (User Enumeration).
-- 
-- Mimari Çözüm:
-- 1. profiles tablosundan genel anonim erişim tamamen geri alınır (REVOKE ALL).
-- 2. profiles_public VIEW oluşturulur (id, phone, bakiye vb. içermez).
-- 3. Vitrindeki projelerin (ListingService profiles:seller_id) misafir kullanıcılar
--    için patlamaması adına; anon role YALNIZCA vitrin kolonları için (id, full_name, avatar_url,
--    rating_average, rating_count, is_verified) yetki verilir ve bu yetki RLS ile
--    YALNIZCA aktif onaylı projesi olan geliştiricilerle (EXISTS active listing) sınırlandırılır.
--    Böylece sıradan kayıtlı kullanıcıların id ve bilgileri kesinlikle enumerate edilemez (V1r çözülür).
-- 4. authenticated rolü için profiles tablosunda kendi satırını okuma/yazma (own-row)
--    hakkı RLS ile mühürlenir (B11 regresyonu kalıcı olarak önlenir).
-- 5. Gelecekteki tablolar için ALTER DEFAULT PRIVILEGES ile anon varsayılan ret (default-deny) yapılır.

-- 1. PROFILES TABLOSUNU ANONİM ROLDEN TAMAMEN ARINDIR
REVOKE ALL ON TABLE public.profiles FROM anon, public;

-- 2. PUBLIC-SAFE GÖRÜNÜM (profiles_public)
-- Anonim veya oturumlu kullanıcılar için kullanıcı kimliğini (id) ifşa etmeyen vitrin görünümü
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
    full_name,
    is_verified,
    city,
    district,
    bio,
    avatar_url,
    rating_average,
    rating_count,
    created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3. VİTRİN İLİŞKİ KORUMASI (Listing seller_id join)
-- Sadece vitrin kolonlarına izin verilir (PII: phone, balance, fcm_token, location kapalıdır)
GRANT SELECT (id, full_name, avatar_url, rating_average, rating_count, is_verified)
ON public.profiles TO anon;

-- Anonim rol yalnızca AKTİF projesi olan satıcıların vitrin bilgilerini okuyabilir.
-- Sıradan kullanıcılar veya projesi olmayan hesaplar asla numaralandırılamaz (No Enumeration).
DROP POLICY IF EXISTS "profiles_anon_active_seller_read" ON public.profiles;
CREATE POLICY "profiles_anon_active_seller_read" ON public.profiles
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.listings
        WHERE public.listings.seller_id = public.profiles.id
          AND public.listings.status = 'active'
    )
);

-- 4. AUTHENTICATED ROLÜ İÇİN SIKIŞTIRILMIŞ OWN-ROW YETKİLERİ (B11 ÖNLEYİCİ)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.listings
        WHERE public.listings.seller_id = public.profiles.id
          AND public.listings.status = 'active'
    )
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. KAMUYA AÇIK OKUMA TABLOLARINI TEYİT ET
GRANT SELECT ON public.listings,
                 public.project_comments,
                 public.project_upvotes,
                 public.listing_images,
                 public.blog_posts,
                 public.categories
    TO anon;

-- 6. VARSAYILAN RET (DEFAULT-DENY)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
