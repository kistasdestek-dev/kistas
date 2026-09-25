-- ============================================================
-- SUPABASE DASHBOARD SQL EDITOR'A KOPYALA-YAPISTIR VE ÇALIŞTIR
-- ============================================================

-- 1. TEPKİ TABLOSU
CREATE TABLE IF NOT EXISTS public.project_comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction SMALLINT NOT NULL CHECK (reaction IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_comment_reactions_unique_vote UNIQUE (comment_id, user_id)
);

-- 2. DENORMALİZE SAYAÇLAR
ALTER TABLE public.project_comments
    ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dislikes_count INTEGER NOT NULL DEFAULT 0;

-- 3. RLS
ALTER TABLE public.project_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment reactions are publicly readable" ON public.project_comment_reactions;
CREATE POLICY "Comment reactions are publicly readable"
    ON public.project_comment_reactions FOR SELECT
    USING (true);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.project_comment_reactions FROM public, anon, authenticated;
GRANT SELECT ON TABLE public.project_comment_reactions TO anon, authenticated;

-- 4. ATOMİK TOGGLE RPC
CREATE OR REPLACE FUNCTION public.toggle_project_comment_reaction(
    p_comment_id UUID,
    p_reaction SMALLINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
    v_user_id UUID := auth.uid();
    v_comment public.project_comments%ROWTYPE;
    v_listing_status TEXT;
    v_muted_until TIMESTAMPTZ;
    v_existing SMALLINT;
    v_likes INTEGER := 0;
    v_dislikes INTEGER := 0;
    v_action TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED', 'error', 'Tepki vermek icin oturum acmalisiniz.');
    END IF;

    IF p_reaction IS NULL OR p_reaction NOT IN (1, -1) THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_REACTION', 'error', 'Gecersiz tepki turu.');
    END IF;

    IF NOT COALESCE(
        (public.enforce_adaptive_rate_limit(v_user_id::TEXT, 'comment_reaction', 20, 10, 3, NULL) ->> 'allowed')::BOOLEAN,
        TRUE
    ) THEN
        RETURN jsonb_build_object('success', false, 'code', 'RATE_LIMITED', 'error', 'Cok hizli tepki veriyorsunuz. Lutfen 10 saniye bekleyin.');
    END IF;

    SELECT profile.comment_muted_until
    INTO v_muted_until
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id;

    IF v_muted_until > clock_timestamp() THEN
        RETURN jsonb_build_object('success', false, 'code', 'COMMENT_MUTED', 'error', 'Yorum ve tepki yetkiniz gecici olarak durduruldu.');
    END IF;

    PERFORM 1
    FROM auth.users AS auth_user
    LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id
    WHERE auth_user.id = v_user_id
      AND (COALESCE(profile.is_verified, FALSE) OR auth_user.email_confirmed_at IS NOT NULL);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'VERIFICATION_REQUIRED', 'error', 'Tepki vermek icin hesabinizi dogrulamalisiniz.');
    END IF;

    SELECT *
    INTO v_comment
    FROM public.project_comments AS comment
    WHERE comment.id = p_comment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'COMMENT_NOT_FOUND', 'error', 'Yorum bulunamadi.');
    END IF;

    SELECT listing.status::TEXT
    INTO v_listing_status
    FROM public.listings AS listing
    WHERE listing.id = v_comment.listing_id;

    IF COALESCE(v_listing_status, '') <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'COMMENT_NOT_FOUND', 'error', 'Bu yoruma tepki verilemiyor.');
    END IF;

    SELECT reaction.reaction
    INTO v_existing
    FROM public.project_comment_reactions AS reaction
    WHERE reaction.comment_id = p_comment_id
      AND reaction.user_id = v_user_id;

    IF v_existing IS NULL THEN
        INSERT INTO public.project_comment_reactions (comment_id, user_id, reaction)
        VALUES (p_comment_id, v_user_id, p_reaction)
        ON CONFLICT (comment_id, user_id)
        DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW();
        v_action := 'reacted';
    ELSIF v_existing = p_reaction THEN
        DELETE FROM public.project_comment_reactions
        WHERE comment_id = p_comment_id AND user_id = v_user_id;
        v_action := 'removed';
    ELSE
        UPDATE public.project_comment_reactions
        SET reaction = p_reaction, updated_at = NOW()
        WHERE comment_id = p_comment_id AND user_id = v_user_id;
        v_action := 'switched';
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE reaction.reaction = 1)::INTEGER,
        COUNT(*) FILTER (WHERE reaction.reaction = -1)::INTEGER
    INTO v_likes, v_dislikes
    FROM public.project_comment_reactions AS reaction
    WHERE reaction.comment_id = p_comment_id;

    UPDATE public.project_comments
    SET likes_count = v_likes, dislikes_count = v_dislikes
    WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true,
        'action', v_action,
        'my_reaction', CASE WHEN v_action = 'removed' THEN NULL ELSE p_reaction END,
        'likes_count', v_likes,
        'dislikes_count', v_dislikes
    );
END;
$func$;

REVOKE ALL ON FUNCTION public.toggle_project_comment_reaction(UUID, SMALLINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_project_comment_reaction(UUID, SMALLINT) TO authenticated;

-- 5. SCHEMA CACHE YENİLE
NOTIFY pgrst, 'reload schema';
