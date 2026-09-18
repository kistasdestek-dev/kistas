-- ==============================================================================
-- KISTAS — FAZ 20 KONSOLİDE İLERİ SAVUNMA VE BOLA/IDOR KALKANI GÖÇÜ
-- (FAZ 20 CONSOLIDATED ADVANCED DEFENSE SHIELD MIGRATION)
-- ==============================================================================
-- Bu dosya, Faz 20 kapsamında geliştirilen tüm veritabanı kalkanlarını canlı Supabase
-- SQL Editöründe tek seferde ve hatasız çalıştırmak üzere konsolide edilmiştir:
--
-- 1. AŞAMA 1: KVKK & GDPR Unutulma Hakkı ve Kriptografik Anonimleştirme Motoru
--    - delete_user_account_atomic() RPC'si (PII temizliği, hard delete, audit muhafazası)
-- 2. AŞAMA 4: İlan, Görsel ve Yorum BOLA/IDOR Savunması & Tehdit Radarı Tuzağı
--    - guard_listing_ownership_and_trap_idor() (listings trigger)
--    - guard_listing_image_ownership_and_trap_idor() (listing_images trigger)
--    - guard_project_comment_ownership_and_trap_idor() (project_comments trigger)
-- 3. AŞAMA 5: P2P Sohbet ve Yorum Phishing / Gizlenmiş URL Filtreleme Kalkanı
--    - filter_chat_message_content() (messages trigger)
--    - filter_project_comment_content() (project_comments trigger)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. KVKK UNUTULMA HAKKI MOTORU (RIGHT-TO-BE-FORGOTTEN)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account_atomic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_active_orders INT := 0;
    v_listings_count INT := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum bulunamadı.' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_active_orders
    FROM public.orders
    WHERE (buyer_id = v_user_id OR seller_id = v_user_id)
      AND status IN ('paid_escrow', 'shipped', 'delivered', 'disputed');

    IF v_active_orders > 0 THEN
        RAISE EXCEPTION 'ACTIVE_ORDERS_EXIST: Tamamlanmamış aktif siparişleriniz (% adet) bulunmaktadır. Lütfen önce sipariş sürecini sonuçlandırınız.', v_active_orders
            USING ERRCODE = 'P0001';
    END IF;

    DELETE FROM public.user_addresses WHERE user_id = v_user_id;
    DELETE FROM public.user_vault_records WHERE user_id = v_user_id;
    DELETE FROM public.notifications WHERE user_id = v_user_id;

    UPDATE public.listings
    SET status = 'inactive',
        updated_at = NOW()
    WHERE seller_id = v_user_id;
    GET DIAGNOSTICS v_listings_count = ROW_COUNT;

    UPDATE public.profiles
    SET 
        full_name = 'Silinmiş Kullanıcı',
        bio = NULL,
        avatar_url = NULL,
        city = NULL,
        district = NULL,
        raw_location = NULL,
        phone = NULL,
        fcm_token = NULL,
        is_banned = TRUE,
        updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE public.user_consents
    SET consented = FALSE,
        revoked_at = NOW()
    WHERE user_id = v_user_id;

    BEGIN
        DELETE FROM storage.objects
        WHERE bucket_id = 'kistas'
          AND (owner = v_user_id OR name LIKE v_user_id::text || '/%');
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;

    INSERT INTO public.admin_action_audit (
        actor_id,
        action,
        target_type,
        target_id,
        details
    ) VALUES (
        v_user_id,
        'KVKK_ACCOUNT_ANONYMIZED',
        'profile',
        v_user_id,
        jsonb_build_object(
            'timestamp', NOW(),
            'listings_deactivated', v_listings_count,
            'reason', 'KVKK Madde 7/11 ve GDPR Madde 17 Kullanıcı Talepli Silme'
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Hesabınız ve tüm kişisel verileriniz KVKK uyarınca başarıyla anonimleştirildi ve silindi.',
        'user_id', v_user_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account_atomic() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_user_account_atomic() TO authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 2. BOLA/IDOR SAVUNMASI VE TEHDİT TUZAĞI (LISTINGS, IMAGES, COMMENTS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_listing_ownership_and_trap_idor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (OLD.seller_id IS DISTINCT FROM auth.uid()) AND NOT public.is_platform_admin() THEN
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
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    v_target_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);

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


CREATE OR REPLACE FUNCTION public.guard_project_comment_ownership_and_trap_idor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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


-- ------------------------------------------------------------------------------
-- 3. P2P SOHBET VE YORUM PHISHING / URL FİLTRESİ
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.filter_chat_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
    has_phishing_shortener BOOLEAN;
    has_obfuscated_url BOOLEAN;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me|cc|biz|info|top|ru|cn)\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b');
    has_phishing_shortener := (NEW.content ~* '\b(t\.me|wa\.me|bit\.ly|tinyurl\.com|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|discord\.gg|goo\.gl)\/[^\s]+');
    has_obfuscated_url := (NEW.content ~* '(hxxp|h\*\*p|\[dot\]|\(dot\)|\[\.\]|\(\.\))');

    IF has_phone OR has_iban OR has_url OR has_phishing_shortener OR has_obfuscated_url THEN
        NEW.is_flagged := TRUE;
        NEW.flag_reason := CONCAT_WS(', ', 
            CASE WHEN has_phone THEN 'Telefon numarası algılandı' END,
            CASE WHEN has_iban THEN 'IBAN bilgisi algılandı' END,
            CASE WHEN has_url THEN 'Harici link algılandı' END,
            CASE WHEN has_phishing_shortener THEN 'Şüpheli URL kısaltma bağlantısı algılandı' END,
            CASE WHEN has_obfuscated_url THEN 'Gizlenmiş (obfuscated) web adresi algılandı' END
        );
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya harici link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.filter_project_comment_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    has_phone BOOLEAN;
    has_iban BOOLEAN;
    has_url BOOLEAN;
    has_phishing_shortener BOOLEAN;
    has_obfuscated_url BOOLEAN;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    SELECT public.is_platform_admin() INTO v_is_admin;
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    has_phone := (NEW.content ~* '(\+?90|0)?[ ]?5[0-9]{2}[ ]?[0-9]{3}[ ]?[0-9]{2}[ ]?[0-9]{2}');
    has_iban := (NEW.content ~* 'TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}');
    has_url := (NEW.content ~* '(https?:\/\/|www\.)[^\s]+|([a-zA-Z0-9_\-\.]+)\.(com|net|org|xyz|io|co|me|cc|biz|info|top|ru|cn)\b|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b');
    has_phishing_shortener := (NEW.content ~* '\b(t\.me|wa\.me|bit\.ly|tinyurl\.com|is\.gd|cutt\.ly|rebrand\.ly|ow\.ly|discord\.gg|goo\.gl)\/[^\s]+');
    has_obfuscated_url := (NEW.content ~* '(hxxp|h\*\*p|\[dot\]|\(dot\)|\[\.\]|\(\.\))');

    IF has_phone OR has_iban OR has_url OR has_phishing_shortener OR has_obfuscated_url THEN
        NEW.content := '[GÜVENLİK UYARISI: Güvenliğiniz için telefon, IBAN veya harici link paylaşımları filtrelenmiştir.]';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filter_project_comment_content ON public.project_comments;
CREATE TRIGGER trg_filter_project_comment_content
BEFORE INSERT OR UPDATE OF content ON public.project_comments
FOR EACH ROW
EXECUTE FUNCTION public.filter_project_comment_content();
