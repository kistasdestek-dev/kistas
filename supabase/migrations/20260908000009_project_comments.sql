-- Project discussion: verified members can comment and project owners can reply.
CREATE TABLE IF NOT EXISTS public.project_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 1200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_listing_created
    ON public.project_comments (listing_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_project_comments_parent
    ON public.project_comments (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project comments are publicly readable" ON public.project_comments;
CREATE POLICY "Project comments are publicly readable"
    ON public.project_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authors delete own project comments" ON public.project_comments;
CREATE POLICY "Authors delete own project comments"
    ON public.project_comments FOR DELETE TO authenticated
    USING (auth.uid() = author_id);

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

CREATE OR REPLACE FUNCTION public.notify_project_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_listing public.listings%ROWTYPE;
    v_parent_author UUID;
    v_author_name TEXT;
    v_recipient UUID;
BEGIN
    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
    SELECT COALESCE(NULLIF(full_name, ''), 'Bir kullanıcı')
      INTO v_author_name FROM public.profiles WHERE id = NEW.author_id;

    IF NEW.parent_id IS NULL THEN
        v_recipient := v_listing.seller_id;
    ELSE
        SELECT author_id INTO v_parent_author FROM public.project_comments WHERE id = NEW.parent_id;
        v_recipient := v_parent_author;
    END IF;

    IF v_recipient IS NOT NULL AND v_recipient <> NEW.author_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, title, body, data)
        VALUES (
            v_recipient,
            NEW.author_id,
            'review',
            CASE WHEN NEW.parent_id IS NULL THEN 'Projenize yeni yorum' ELSE 'Yorumunuza geliştirici yanıtı' END,
            CASE
                WHEN NEW.parent_id IS NULL THEN format('%s, “%s” projenize yorum yaptı.', v_author_name, v_listing.title)
                ELSE format('%s, “%s” projesindeki yorumunuzu yanıtladı.', v_author_name, v_listing.title)
            END,
            jsonb_build_object('listing_id', NEW.listing_id, 'comment_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_comment ON public.project_comments;
CREATE TRIGGER trg_notify_project_comment
    AFTER INSERT ON public.project_comments
    FOR EACH ROW EXECUTE FUNCTION public.notify_project_comment();

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
