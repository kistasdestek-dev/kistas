-- ============================================================================
-- 20260910000003_admin_grant_project_support.sql
-- YÖNETİM DESTEĞİ VE GELİŞTİRİCİ TEŞVİK ARACI (ADMIN-ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_grant_project_support(
    p_listing_id UUID,
    p_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_old_upvotes INTEGER;
    v_new_upvotes INTEGER;
    v_project_title TEXT;
    v_seller_id UUID;
    v_category_id UUID;
BEGIN
    -- 1. Yönetici Yetki Kontrolü
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Bu işlem için doğrulanmış yönetici yetkisi gerekir.';
    END IF;

    -- 2. Parametre Doğrulama (-100 ile +500 arası)
    IF p_amount IS NULL OR p_amount = 0 OR p_amount < -100 OR p_amount > 500 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Destek miktarı -100 ile +500 arasında (0 hariç) olmalıdır.';
    END IF;

    -- 3. Proje Varlık Kontrolü
    SELECT title, seller_id, category_id, COALESCE(upvotes_count, 0)
    INTO v_project_title, v_seller_id, v_category_id, v_old_upvotes
    FROM public.listings
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Belirtilen proje bulunamadı.';
    END IF;

    -- 4. Toplam Destek Sayısını Güncelle
    v_new_upvotes := GREATEST(0, v_old_upvotes + p_amount);

    UPDATE public.listings
    SET upvotes_count = v_new_upvotes,
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- 5. Haftalık ve Organik Sıralamaya Katılım İçin Admin Oy Kaydı
    -- (Yönetici oyu project_upvotes tablosuna da işlenerek haftalık algoritmanın
    -- projeyi organik liderlik adaylığına ve vitrine dahil etmesi sağlanır)
    IF p_amount > 0 THEN
        INSERT INTO public.project_upvotes (project_id, user_id, created_at)
        VALUES (p_listing_id, v_actor_id, NOW())
        ON CONFLICT (project_id, user_id) DO UPDATE
        SET created_at = NOW();
    ELSIF v_new_upvotes = 0 THEN
        DELETE FROM public.project_upvotes
        WHERE project_id = p_listing_id
          AND user_id = v_actor_id;
    END IF;

    -- 6. Denetim İzi (Audit Log)
    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        v_actor_id,
        'listing_support_granted',
        'listing',
        p_listing_id,
        jsonb_build_object(
            'project_id', p_listing_id,
            'project_title', v_project_title,
            'granted_amount', p_amount,
            'old_upvotes', v_old_upvotes,
            'new_upvotes', v_new_upvotes,
            'seller_id', v_seller_id,
            'category_id', v_category_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'project_id', p_listing_id,
        'added_amount', p_amount,
        'new_upvotes_count', v_new_upvotes
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_project_support(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_project_support(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_grant_project_support(UUID, INTEGER) IS
'Yönetici Teşvik Desteği: Geliştiricileri motive etmek ve projeleri öne taşımak için güvenli destek puanı tanımlar.';
