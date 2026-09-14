DELETE FROM private.platform_admins
WHERE email = 'visionprefabrik@gmail.com';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS comment_muted_until TIMESTAMPTZ;

DROP FUNCTION IF EXISTS public.get_admin_users();

CREATE FUNCTION public.get_admin_users()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    user_role TEXT,
    boost_credits INTEGER,
    available_balance NUMERIC,
    is_verified BOOLEAN,
    projects_count BIGINT,
    comment_muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    RETURN QUERY
    SELECT
        auth_user.id,
        COALESCE(profile.full_name, SPLIT_PART(auth_user.email, '@', 1))::TEXT,
        auth_user.email::TEXT,
        CASE WHEN platform_admin.email IS NULL THEN 'user' ELSE 'admin' END::TEXT,
        COALESCE(profile.boost_credits, 0),
        COALESCE(profile.available_balance, 0),
        COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL,
        COUNT(listing.id),
        profile.comment_muted_until,
        COALESCE(profile.created_at, auth_user.created_at)
    FROM auth.users AS auth_user
    LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
    LEFT JOIN private.platform_admins AS platform_admin
      ON platform_admin.email = LOWER(auth_user.email)
    LEFT JOIN public.listings AS listing ON listing.seller_id = auth_user.id
    GROUP BY
        auth_user.id,
        auth_user.email,
        auth_user.email_confirmed_at,
        auth_user.created_at,
        profile.full_name,
        profile.boost_credits,
        profile.available_balance,
        profile.is_verified,
        profile.comment_muted_until,
        profile.created_at,
        platform_admin.email
    ORDER BY COALESCE(profile.created_at, auth_user.created_at) DESC, auth_user.id ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_comment_mute(
    p_user_id UUID,
    p_muted BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_muted_until TIMESTAMPTZ;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'FORBIDDEN: Yönetici yetkisi gerekli.';
    END IF;

    IF p_user_id IS NULL OR p_muted IS NULL THEN
        RAISE EXCEPTION 'INVALID_INPUT: Kullanıcı ve işlem bilgisi gerekli.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        INNER JOIN private.platform_admins AS platform_admin
          ON platform_admin.email = LOWER(auth_user.email)
        WHERE auth_user.id = p_user_id
    ) THEN
        RAISE EXCEPTION 'ADMIN_PROTECTED: Yönetici hesabının yorum yetkisi kapatılamaz.';
    END IF;

    v_muted_until := CASE
        WHEN p_muted THEN clock_timestamp() + INTERVAL '3 days'
        ELSE NULL
    END;

    UPDATE public.profiles
    SET comment_muted_until = v_muted_until,
        updated_at = clock_timestamp()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND: Kullanıcı profili bulunamadı.';
    END IF;

    INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
    VALUES (
        auth.uid(),
        CASE WHEN p_muted THEN 'user_comment_muted' ELSE 'user_comment_unmuted' END,
        'profile',
        p_user_id,
        jsonb_build_object('muted_until', v_muted_until, 'duration_hours', CASE WHEN p_muted THEN 72 ELSE 0 END)
    );

    RETURN jsonb_build_object('success', TRUE, 'muted_until', v_muted_until);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_comment_mute(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_comment_mute(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_project_comment(
    p_listing_id UUID,
    p_body TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS public.project_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_listing public.listings%ROWTYPE;
    v_is_verified BOOLEAN := FALSE;
    v_muted_until TIMESTAMPTZ;
    v_comment public.project_comments%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Yorum yapmak için giriş yapmalısınız.';
    END IF;

    SELECT profile.comment_muted_until
    INTO v_muted_until
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id;

    IF v_muted_until > clock_timestamp() THEN
        RAISE EXCEPTION 'COMMENT_MUTED: Yorum yapma yetkiniz geçici olarak durduruldu.';
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
        SELECT COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL
        INTO v_is_verified
        FROM auth.users AS auth_user
        LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
        WHERE auth_user.id = v_user_id;

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
