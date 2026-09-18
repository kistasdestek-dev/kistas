-- ============================================================================
-- FAZ 20 / AŞAMA 4: İLAN & MEDYA BOLA/IDOR SAVUNMASI VE TEHDİT TUZAĞI
-- (STRICT OBJECT-LEVEL AUTHORIZATION & THREAT TRAPPING)
-- ============================================================================
-- Bu migration:
-- 1. Başkasına ait ilanları (listings), görselleri (listing_images) ve yorumları
--    (project_comments) doğrudan REST veya RPC üzerinden manipüle etme (BOLA/IDOR)
--    girişimlerini veritabanı tetikleyicisi seviyesinde mutlak biçimde engeller.
-- 2. Sessiz reddetmek yerine saldırganın UUID ve IP bilgisini doğrudan
--    `security_threat_events` içine 'BOLA_IDOR_TAMPER' olarak kaydeder (Tehdit Radarı Tuzağı).
-- 3. Yetkili platform yöneticileri ve service_role işlemlerini güvenle muaf tutar.

-- 1. İLANLAR İÇİN BOLA/IDOR KALKANI & TEHDİT TUZAĞI
CREATE OR REPLACE FUNCTION public.guard_listing_ownership_and_trap_idor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- service_role her zaman muaftır
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Yalnızca ilan sahibi veya süper yönetici UPDATE/DELETE yapabilir
    IF (OLD.seller_id IS DISTINCT FROM auth.uid()) AND NOT public.is_platform_admin() THEN
        -- Tehdit Radarına yaz
        BEGIN
            PERFORM public.log_security_threat_event(
                'BOLA_IDOR_LISTING_TAMPER',
                'CRITICAL',
                'İlana yetkisiz ' || TG_OP || ' girişimi: ilan_id=' || OLD.id::text || ', asıl_sahip=' || OLD.seller_id::text || ', aktör=' || COALESCE(auth.uid()::text, 'anon'),
                'BLOCKED_AND_TRAPPED',
                false
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        RAISE EXCEPTION 'FORBIDDEN: Bu ilan üzerinde işlem yapma yetkiniz bulunmamaktadır (BOLA/IDOR engeli).'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_ownership_idor ON public.listings;
CREATE TRIGGER trg_guard_listing_ownership_idor
BEFORE UPDATE OR DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.guard_listing_ownership_and_trap_idor();


-- 2. İLAN GÖRSELLERİ İÇİN BOLA/IDOR KALKANI
CREATE OR REPLACE FUNCTION public.guard_listing_image_ownership_and_trap_idor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_target_listing_id UUID;
    v_seller_id UUID;
BEGIN
    -- service_role her zaman muaftır
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_target_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);

    -- İlgili ilanın gerçek sahibini bul
    SELECT seller_id INTO v_seller_id
    FROM public.listings
    WHERE id = v_target_listing_id;

    IF v_seller_id IS NULL OR (v_seller_id IS DISTINCT FROM auth.uid() AND NOT public.is_platform_admin()) THEN
        BEGIN
            PERFORM public.log_security_threat_event(
                'BOLA_IDOR_IMAGE_TAMPER',
                'CRITICAL',
                'İlan görseline yetkisiz ' || TG_OP || ' müdahalesi: ilan_id=' || COALESCE(v_target_listing_id::text, 'yok') || ', asıl_sahip=' || COALESCE(v_seller_id::text, 'yok') || ', aktör=' || COALESCE(auth.uid()::text, 'anon'),
                'BLOCKED_AND_TRAPPED',
                false
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        RAISE EXCEPTION 'FORBIDDEN: Yalnızca proje sahibi görselleri ekleyebilir, değiştirebilir veya silebilir.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_image_ownership_idor ON public.listing_images;
CREATE TRIGGER trg_guard_listing_image_ownership_idor
BEFORE INSERT OR UPDATE OR DELETE ON public.listing_images
FOR EACH ROW
EXECUTE FUNCTION public.guard_listing_image_ownership_and_trap_idor();


-- 3. PROJE YORUMLARI İÇİN BOLA/IDOR KALKANI
CREATE OR REPLACE FUNCTION public.guard_project_comment_ownership_and_trap_idor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- service_role her zaman muaftır
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (OLD.user_id IS DISTINCT FROM auth.uid()) AND NOT public.is_platform_admin() THEN
        BEGIN
            PERFORM public.log_security_threat_event(
                'BOLA_IDOR_COMMENT_TAMPER',
                'HIGH',
                'Yoruma yetkisiz ' || TG_OP || ' müdahalesi: yorum_id=' || OLD.id::text || ', aktör=' || COALESCE(auth.uid()::text, 'anon'),
                'BLOCKED_AND_TRAPPED',
                false
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        RAISE EXCEPTION 'FORBIDDEN: Yalnızca kendi yorumunuz üzerinde değişiklik yapabilirsiniz.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_comment_ownership_idor ON public.project_comments;
CREATE TRIGGER trg_guard_project_comment_ownership_idor
BEFORE UPDATE OR DELETE ON public.project_comments
FOR EACH ROW
EXECUTE FUNCTION public.guard_project_comment_ownership_and_trap_idor();
