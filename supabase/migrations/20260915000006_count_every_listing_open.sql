-- Her proje detay acilisini ayri bir goruntulenme olarak sayar.
-- Proje sahibi ve aktif olmayan proje korumalari korunur.

ALTER TABLE public.listing_view_events
    ADD COLUMN IF NOT EXISTS id BIGINT GENERATED ALWAYS AS IDENTITY;

ALTER TABLE public.listing_view_events
    DROP CONSTRAINT IF EXISTS listing_view_events_pkey;

ALTER TABLE public.listing_view_events
    ADD CONSTRAINT listing_view_events_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS idx_listing_view_events_listing_created_at
    ON public.listing_view_events (listing_id, created_at DESC);

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
    VALUES (p_listing_id, v_viewer_key);

    UPDATE public.listings
    SET view_count = LEAST(COALESCE(view_count, 0) + 1, 2147483647)
    WHERE id = p_listing_id
    RETURNING view_count INTO v_view_count;

    RETURN jsonb_build_object(
        'success', TRUE,
        'recorded', TRUE,
        'view_count', v_view_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.record_listing_view(UUID, UUID) IS
'Aktif proje detayindaki her kullanici acilisini bir kez sayar; proje sahibini dislar.';
