-- listing_status has no featured value; sponsorship is represented separately.
CREATE OR REPLACE FUNCTION public.create_project_comment(
    p_listing_id UUID,
    p_body TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS public.project_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_listing public.listings%ROWTYPE;
    v_is_verified BOOLEAN := FALSE;
    v_comment public.project_comments%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Yorum yapmak için giriş yapmalısınız.';
    END IF;

    IF char_length(btrim(COALESCE(p_body, ''))) NOT BETWEEN 2 AND 1200 THEN
        RAISE EXCEPTION 'INVALID_COMMENT: Yorum 2 ile 1200 karakter arasında olmalıdır.';
    END IF;

    SELECT * INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Proje yorumlara açık değil.';
    END IF;

    IF p_parent_id IS NULL THEN
        SELECT COALESCE(p.is_verified, FALSE) OR u.email_confirmed_at IS NOT NULL
        INTO v_is_verified
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id = v_user_id;

        IF NOT COALESCE(v_is_verified, FALSE) THEN
            RAISE EXCEPTION 'VERIFICATION_REQUIRED: Yalnızca doğrulanmış kullanıcılar yorum yapabilir.';
        END IF;
    ELSE
        IF v_listing.seller_id <> v_user_id THEN
            RAISE EXCEPTION 'OWNER_REPLY_ONLY: Yorumları yalnızca proje sahibi yanıtlayabilir.';
        END IF;

        PERFORM 1
        FROM public.project_comments
        WHERE id = p_parent_id
          AND listing_id = p_listing_id
          AND parent_id IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PARENT_NOT_FOUND: Yanıtlanacak yorum bulunamadı.';
        END IF;
    END IF;

    INSERT INTO public.project_comments (listing_id, author_id, parent_id, body)
    VALUES (p_listing_id, v_user_id, p_parent_id, btrim(p_body))
    RETURNING * INTO v_comment;

    RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_comment(UUID, TEXT, UUID) TO authenticated;
