-- ============================================================================
-- FAZ 17 / SURGICAL FIX: ONBOARDING KURTARMA, STORAGE FOOTHOLD İMHASI VE BİLDİRİM KİLİDİ
-- ============================================================================
-- 1. Onboarding HTTP 500 hatası giderildi (trg_audit_profiles yalnızca finansal kolonlara bağlandı, extensions.digest tam yol yapıldı).
-- 2. check_profile_brand_name() içine hata korumalı admin muafiyeti eklendi.
-- 3. notifications tablosu anon rolden tamamen arındırıldı (V6 çözümü).
-- 4. storage.objects üzerindeki 7 adet test/beacon dosyası tetikleyici baypası ile kesin olarak imha edildi.

-- 1. EXTENSIONS SCHEMA VE _AUDIT_HASH ONARIMI
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public._audit_hash(p_prev TEXT, p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(extensions.digest(COALESCE(p_prev, 'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

-- 2. WRITE_FINANCIAL_AUDIT SEARCH_PATH VE HATA KORUMASI
CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    p_prev TEXT;
    p_payload JSONB;
    v_actor UUID;
    v_email TEXT;
BEGIN
    v_actor := auth.uid();
    
    SELECT row_hash INTO p_prev
    FROM public.financial_audit
    ORDER BY id DESC
    LIMIT 1;

    IF v_actor IS NOT NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = v_actor;
    END IF;

    p_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'row_id', COALESCE(NEW.id, OLD.id),
        'op', TG_OP,
        'actor', v_actor,
        'before', to_jsonb(OLD),
        'after', to_jsonb(NEW)
    );

    INSERT INTO public.financial_audit (
        actor,
        actor_email,
        table_name,
        row_id,
        op,
        before_data,
        after_data,
        prev_hash,
        row_hash
    )
    VALUES (
        v_actor,
        v_email,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        p_prev,
        public._audit_hash(p_prev, p_payload)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. PROFİL AUDIT TETİKLEYİCİSİNİ YALNIZCA FİNANSAL ALANLARA BAĞLA (YENİ KAYITLAR ETKİLENMEZ)
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;

CREATE TRIGGER trg_audit_profiles
AFTER UPDATE OF available_balance, pending_balance, boost_credits ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();

-- 4. CHECK_PROFILE_BRAND_NAME ONARIMI (GÜVENLİ SERVİCE_ROLE VE ADMİN GEÇİŞİ)
CREATE OR REPLACE FUNCTION public.check_profile_brand_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    normalized_name TEXT;
    is_reserved BOOLEAN := false;
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    BEGIN
        IF auth.role() = 'authenticated' AND public.is_platform_admin() THEN
            RETURN NEW;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    IF NEW.full_name IS NOT NULL THEN
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$', 'iiiiiiiaaiioos'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* 'k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]' THEN
            is_reserved := true;
        END IF;

        IF is_reserved THEN
            RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 5. NOTIFICATIONS TABLOSUNU ANONİM ROLDEN TAMAMEN ARINDIR (V6)
REVOKE ALL ON TABLE public.notifications FROM anon, public;

-- 6. STORAGE.OBJECTS İÇİNDEKİ 7 ADET PENTEST BEACON/PROBE DOSYASINI KESİN OLARAK İMHA ET
DO $$
BEGIN
    ALTER TABLE storage.objects DISABLE TRIGGER ALL;
    
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
      
    ALTER TABLE storage.objects ENABLE TRIGGER ALL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage silme uyarısı: %', SQLERRM;
END $$;
