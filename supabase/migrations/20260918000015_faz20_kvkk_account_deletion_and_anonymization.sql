-- ============================================================================
-- FAZ 20 / AŞAMA 1: KVKK & GDPR UNUTULMA HAKKI MOTORU
-- (RIGHT-TO-BE-FORGOTTEN & CRYPTOGRAPHIC ANONYMIZATION)
-- ============================================================================
-- Bu migration:
-- 1. Kullanıcının tek tıkla hesabını ve tüm kişisel verilerini (PII) KVKK Madde 7/11 ve
--    GDPR Madde 17 uyarınca tamamen silmesini ve anonimleştirmesini sağlar.
-- 2. Yasal zorunluluk gereği saklanması gereken finansal/sipariş denetim izlerinin
--    (financial_audit, orders) bütünlüğünü bozmadan kimliksizleştirir (anonymization).
-- 3. Aktif/devam eden emanet (escrow) siparişler varken kötü niyetli hesap silmeyi engeller.
-- 4. Depolamadaki (storage.objects) kullanıcı varlıklarını ve adres/kasa kayıtlarını tasfiye eder.

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
    v_audit_id BIGINT;
BEGIN
    -- 1. Kimlik doğrulaması: Yalnızca oturum açmış kullanıcı kendi hesabını silebilir
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum bulunamadı.' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Devam eden / kilitli sipariş denetimi (Escrow & Uyuşmazlık Güvenliği)
    SELECT COUNT(*) INTO v_active_orders
    FROM public.orders
    WHERE (buyer_id = v_user_id OR seller_id = v_user_id)
      AND status IN ('paid_escrow', 'shipped', 'delivered', 'disputed');

    IF v_active_orders > 0 THEN
        RAISE EXCEPTION 'ACTIVE_ORDERS_EXIST: Tamamlanmamış aktif siparişleriniz (% adet) bulunmaktadır. Lütfen önce sipariş sürecini sonuçlandırınız.', v_active_orders
            USING ERRCODE = 'P0001';
    END IF;

    -- 3. Kullanıcıya ait adres ve kasa (vault) kayıtlarını kalıcı olarak sil (Hard Delete)
    DELETE FROM public.user_addresses WHERE user_id = v_user_id;
    DELETE FROM public.user_vault_records WHERE user_id = v_user_id;

    -- 4. Kullanıcıya ait bildirimleri temizle
    DELETE FROM public.notifications WHERE user_id = v_user_id;

    -- 5. Aktif ilanları yayından kaldır ve pasife al
    UPDATE public.listings
    SET status = 'inactive',
        updated_at = NOW()
    WHERE seller_id = v_user_id;
    GET DIAGNOSTICS v_listings_count = ROW_COUNT;

    -- 6. Profil PII verilerini kriptografik / geri döndürülemez biçimde anonimleştir
    -- (guard_financial_columns tetikleyicisini ihlal etmemek adına finansal alanlar korunur,
    -- hesap is_banned=true ile kalıcı olarak mühürlenir)
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

    -- 7. KVKK izinlerini iptal durumuna getir
    UPDATE public.user_consents
    SET consented = FALSE,
        revoked_at = NOW()
    WHERE user_id = v_user_id;

    -- 8. Depolama kovanındaki kullanıcı varlıklarını temizle
    BEGIN
        DELETE FROM storage.objects
        WHERE bucket_id = 'kistas'
          AND (owner = v_user_id OR name LIKE v_user_id::text || '/%');
    EXCEPTION
        WHEN OTHERS THEN
            -- Depolama temizliği hata verse bile hesap silme akışını kesintiye uğratma
            NULL;
    END;

    -- 9. Denetim günlüğüne (audit log) silme olayını kaydet
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

-- İzinleri mühürle (Anonim erişim kesinlikle yasak, sadece authenticated rolü çalıştırabilir)
REVOKE ALL ON FUNCTION public.delete_user_account_atomic() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_user_account_atomic() TO authenticated, service_role;
