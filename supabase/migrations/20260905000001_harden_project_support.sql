-- ============================================================================
-- FAZ 1: PROJE DESTEK KURALLARI VE SPONSORLUK KİLİDİ
-- ============================================================================

-- Destek tablosuna doğrudan yazmayı kapat. Bütün değişiklikler aşağıdaki
-- atomik RPC üzerinden geçerek aynı kurallara tabi olur.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_upvotes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.toggle_project_upvote(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_seller_id UUID;
    v_status TEXT;
    v_boosted_until TIMESTAMPTZ;
    v_has_upvoted BOOLEAN;
    v_email_verified BOOLEAN;
    v_new_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'AUTH_REQUIRED',
            'error', 'Desteklemek için oturum açmalısınız.'
        );
    END IF;

    SELECT (u.email_confirmed_at IS NOT NULL)
    INTO v_email_verified
    FROM auth.users AS u
    WHERE u.id = v_user_id;

    IF COALESCE(v_email_verified, false) = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EMAIL_VERIFICATION_REQUIRED',
            'error', 'Desteklemek için e-posta adresinizi doğrulamalısınız.'
        );
    END IF;

    -- Proje satırını kilitlemek, eş zamanlı destek işlemlerinde sayacın
    -- proje_upvotes tablosuyla tutarlı kalmasını sağlar.
    SELECT l.seller_id, l.status::TEXT, l.boosted_until
    INTO v_seller_id, v_status, v_boosted_until
    FROM public.listings AS l
    WHERE l.id = p_project_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PROJECT_NOT_FOUND',
            'error', 'Proje bulunamadı.'
        );
    END IF;

    IF v_status <> 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PROJECT_NOT_ACTIVE',
            'error', 'Yalnızca aktif projeler desteklenebilir.'
        );
    END IF;

    IF v_seller_id = v_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SELF_SUPPORT_NOT_ALLOWED',
            'error', 'Kendi projenizi destekleyemezsiniz.'
        );
    END IF;

    -- Sponsorlu dönemde destek ekleme ve geri alma birlikte kilitlenir.
    -- Sponsorlu olmanın tek doğruluk kaynağı boosted_until alanıdır.
    IF v_boosted_until IS NOT NULL AND v_boosted_until > clock_timestamp() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SPONSORED_SUPPORT_LOCKED',
            'error', 'Sponsorlu projelerde destek geçici olarak kapalıdır.',
            'boosted_until', v_boosted_until
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.project_upvotes AS pu
        WHERE pu.project_id = p_project_id
          AND pu.user_id = v_user_id
    )
    INTO v_has_upvoted;

    IF v_has_upvoted THEN
        DELETE FROM public.project_upvotes AS pu
        WHERE pu.project_id = p_project_id
          AND pu.user_id = v_user_id;
    ELSE
        INSERT INTO public.project_upvotes (project_id, user_id)
        VALUES (p_project_id, v_user_id)
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;

    SELECT COUNT(*)::INTEGER
    INTO v_new_count
    FROM public.project_upvotes AS pu
    WHERE pu.project_id = p_project_id;

    UPDATE public.listings AS l
    SET upvotes_count = v_new_count
    WHERE l.id = p_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'action', CASE WHEN v_has_upvoted THEN 'unvoted' ELSE 'upvoted' END,
        'upvotes_count', v_new_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_project_upvote(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_project_upvote(UUID) TO authenticated;

COMMENT ON FUNCTION public.toggle_project_upvote(UUID) IS
'Atomik proje desteği: doğrulanmış e-posta, aktif proje, öz-destek yasağı ve aktif sponsorluk kilidi uygular.';
