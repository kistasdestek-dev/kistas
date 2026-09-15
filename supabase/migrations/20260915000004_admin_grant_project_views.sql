-- ============================================================================
-- 20260915000004_admin_grant_project_views.sql
-- YÖNETİM GÖRÜNÜRLÜK (GÖRÜNTÜLENME) TANIMLAMA ARACI (ADMIN-ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_grant_project_views(
    p_listing_id UUID,
    p_amount INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_old_views INTEGER;
    v_new_views INTEGER;
    v_project_title TEXT;
BEGIN
    -- 1. Yönetici Yetki Kontrolü
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Bu işlem için doğrulanmış yönetici yetkisi gerekir.';
    END IF;

    -- 2. Parametre Doğrulama (1 ile 100.000 arası pozitif tamsayı)
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Görünürlük miktarı 1 ile 100.000 arasında olmalıdır.';
    END IF;

    -- 3. Proje Varlık Kontrolü
    SELECT title, COALESCE(view_count, 0)
    INTO v_project_title, v_old_views
    FROM public.listings
    WHERE id = p_listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Belirtilen proje bulunamadı.';
    END IF;

    -- 4. Toplam Görüntülenme Sayısını Güncelle (Taşmayı önlemek için MAX INT koruması)
    v_new_views := LEAST(2147483647, v_old_views + p_amount);

    UPDATE public.listings
    SET view_count = v_new_views,
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- 5. Başarılı Yanıt Döndür
    RETURN jsonb_build_object(
        'success', TRUE,
        'listing_id', p_listing_id,
        'title', v_project_title,
        'added_views', p_amount,
        'old_view_count', v_old_views,
        'new_view_count', v_new_views
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_project_views(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_project_views(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_grant_project_views(UUID, INTEGER) IS
'Yöneticilerin projelere doğrudan görüntülenme/görünürlük kotası eklemesini sağlayan güvenli RPC.';
