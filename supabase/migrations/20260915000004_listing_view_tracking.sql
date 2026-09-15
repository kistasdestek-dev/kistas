-- Gerçek proje detay görüntülenmelerini oturum/gün bazında tekilleştirir.
-- Yönetici Vitrin Desteği boosted_until üzerinden ayrı ve şeffaf kalır.

CREATE TABLE IF NOT EXISTS public.listing_view_events (
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    viewer_key TEXT NOT NULL,
    viewed_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (listing_id, viewer_key, viewed_on),
    CONSTRAINT listing_view_events_viewer_key_length
        CHECK (char_length(viewer_key) BETWEEN 5 AND 80)
);

ALTER TABLE public.listing_view_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_view_events FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_listing_view_events_created_at
    ON public.listing_view_events (created_at DESC);

CREATE OR REPLACE FUNCTION public.record_listing_view(
    p_listing_id UUID,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_seller_id UUID;
    v_status public.listing_status;
    v_viewer_key TEXT;
    v_inserted INTEGER := 0;
    v_view_count INTEGER := 0;
BEGIN
    SELECT listing.seller_id, listing.status, COALESCE(listing.view_count, 0)
    INTO v_seller_id, v_status, v_view_count
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id;

    IF NOT FOUND OR v_status <> 'active' THEN
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', 0);
    END IF;

    IF v_actor_id IS NOT NULL AND v_actor_id = v_seller_id THEN
        RETURN jsonb_build_object('success', TRUE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    IF v_actor_id IS NOT NULL THEN
        v_viewer_key := 'user:' || v_actor_id::TEXT;
    ELSIF p_session_id IS NOT NULL THEN
        v_viewer_key := 'anon:' || p_session_id::TEXT;
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'recorded', FALSE, 'view_count', v_view_count);
    END IF;

    INSERT INTO public.listing_view_events (listing_id, viewer_key)
    VALUES (p_listing_id, v_viewer_key)
    ON CONFLICT (listing_id, viewer_key, viewed_on) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 1 THEN
        UPDATE public.listings
        SET view_count = LEAST(COALESCE(view_count, 0) + 1, 2147483647)
        WHERE id = p_listing_id
        RETURNING view_count INTO v_view_count;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'recorded', v_inserted = 1,
        'view_count', v_view_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.record_listing_view(UUID, UUID) IS
'Aktif proje detay görüntülenmesini kullanıcı veya anonim oturum başına günde bir kez sayar; proje sahibini dışlar.';
