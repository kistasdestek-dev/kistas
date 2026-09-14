-- 20260911000001_sync_verified_publishers.sql
-- Kural: Projeleri onaylanan herkes mavi tikli (is_verified = true) olsun. Proje paylasmayanlarda mavi tik olmasin.

-- 1. Mevcut onaylanmis/aktif projesi olan tum gelistiricileri otomatik dogrula
UPDATE public.profiles
SET is_verified = TRUE,
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT seller_id
    FROM public.listings
    WHERE status = 'active'
);

-- 2. admin_update_listing_status fonksiyonunu guncelle:
--    Proje 'active' durumuna alindiginda (onaylandiginda) saticinin profiline is_verified = TRUE ata.
CREATE OR REPLACE FUNCTION public.admin_update_listing_status(
    p_listing_id UUID,
    p_status public.listing_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    UPDATE public.listings
    SET status = p_status,
        boosted_until = CASE WHEN p_status = 'active' THEN boosted_until ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_listing_id
    RETURNING seller_id INTO v_seller_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
    END IF;

    -- Eger proje onaylanip aktif yapildiysa saticiyi otomatik olarak dogrulanmis yap
    IF p_status = 'active' AND v_seller_id IS NOT NULL THEN
        UPDATE public.profiles
        SET is_verified = TRUE,
            updated_at = NOW()
        WHERE id = v_seller_id;
    END IF;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        'listing_status_updated',
        'listing',
        p_listing_id,
        jsonb_build_object('status', p_status, 'seller_id', v_seller_id)
    );

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_listing_status(UUID, public.listing_status) TO authenticated;
