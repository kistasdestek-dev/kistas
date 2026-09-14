-- ============================================================================
-- FAZ 1 / FAZ 4: KISTAS MARKA ADI VE KİMLİK TAKLİDİ KORUMASI (SEC-003)
-- ============================================================================
-- Yalnızca doğrulanmış platform yöneticileri 'Kıstas' adını veya varyasyonlarını
-- profil tam adı (full_name) olarak kaydedebilir veya güncelleyebilir.

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
    IF NEW.full_name IS NOT NULL THEN
        -- 1. Türkçe karakter ve leetspeak normalizasyonu
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$', 'iiiiiiiaaiioos'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        -- 2. Marka adı eşleşme kontrolü
        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* 'k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]' THEN
            is_reserved := true;
        END IF;

        -- 3. Yetkisiz kullanım tespiti
        IF is_reserved THEN
            IF NOT public.is_platform_admin() THEN
                RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.';
            END IF;
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

COMMENT ON FUNCTION public.check_profile_brand_name() IS
'Sıradan kullanıcıların Kıstas marka adını ve taklit varyasyonlarını profil adı olarak almasını veritabanı seviyesinde engeller.';
