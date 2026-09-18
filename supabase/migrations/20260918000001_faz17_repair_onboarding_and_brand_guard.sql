-- ============================================================================
-- FAZ 17 / AŞAMA 1: ONBOARDING & KAYIT KURTARMA (PARSRAPOR V9 & SEC-003)
-- ============================================================================
-- PARS DevState Bulgusu V9:
-- handle_new_user() fonksiyonunun varsayılan 'Kıstas Üyesi' fallback'i,
-- check_profile_brand_name() tetikleyicisi tarafından 'kistas' marka taklidi
-- olarak algılanıp engellendiği için tüm yeni kayıtlar HTTP 500 alıyordu.
-- Bu migration ile:
-- 1. handle_new_user() fallback ismi 'Topluluk Üyesi'ne çevrilir.
-- 2. check_profile_brand_name() tetikleyicisine service_role muafiyeti eklenir.
-- 3. profiles tablosunda kullanıcıların kendi satırını ekleme/güncelleme (own-row) RLS politikası pekiştirilir.

-- 1. BRAND NAME PROTECTION TRIGGER GÜNCELLEMESİ
CREATE OR REPLACE FUNCTION public.check_profile_brand_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    normalized_name TEXT;
    is_reserved BOOLEAN := false;
BEGIN
    -- service_role veya platform yöneticileri her zaman muaftır
    IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.full_name IS NOT NULL THEN
        -- 1. Türkçe karakter ve leetspeak normalizasyonu
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$', 'iiiiiiiaaiioos'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        -- 2. Marka adı eşleşme kontrolü (Sadece 'kistas' taklitlerini yakala)
        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* 'k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]' THEN
            is_reserved := true;
        END IF;

        -- 3. Yetkisiz kullanım tespiti
        IF is_reserved THEN
            RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_brand_name ON public.profiles;

CREATE TRIGGER trg_check_profile_brand_name
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_brand_name();

-- 2. HANDLE_NEW_USER GÜNCELLEMESİ ('Kıstas Üyesi' yerine 'Topluluk Üyesi')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            'Topluluk Üyesi'
        ),
        'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png',
        NEW.phone
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = NOW()
    WHERE public.profiles.id = EXCLUDED.id;

    RETURN NEW;
END;
$$;

-- 3. PROFILES OWN-ROW INSERT & UPDATE RLS POLİTİKALARI PEKİŞTİRME
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
