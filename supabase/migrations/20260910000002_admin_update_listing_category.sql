-- ============================================================================
-- 20260910000002_admin_update_listing_category.sql
-- ADMIN PROJE KATEGORİ DEĞİŞTİRME YETKİSİ VE DENETİM İZİ
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_listing_category(
    p_listing_id UUID,
    p_category_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cat_exists BOOLEAN;
    v_old_category_id UUID;
    v_new_category_name TEXT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    IF p_category_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.categories WHERE id = p_category_id
        ), name INTO v_cat_exists, v_new_category_name
        FROM public.categories WHERE id = p_category_id;

        IF NOT v_cat_exists THEN
            RAISE EXCEPTION 'CATEGORY_NOT_FOUND: Seçilen kategori bulunamadı.';
        END IF;
    END IF;

    SELECT category_id INTO v_old_category_id
    FROM public.listings
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje bulunamadı.';
    END IF;

    UPDATE public.listings
    SET category_id = p_category_id,
        updated_at = NOW()
    WHERE id = p_listing_id;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        'listing_category_updated',
        'listing',
        p_listing_id,
        jsonb_build_object(
            'old_category_id', v_old_category_id,
            'new_category_id', p_category_id,
            'new_category_name', v_new_category_name
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'category_id', p_category_id,
        'category_name', v_new_category_name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_listing_category(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_listing_category(UUID, UUID) TO authenticated;
