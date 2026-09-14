-- Sponsorlu Vitrin kredi oranlarını premium görünürlük ekonomisine göre günceller.
CREATE OR REPLACE FUNCTION public.boost_listing_with_credits(
    p_listing_id UUID,
    p_duration_hours INTEGER,
    p_credit_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_seller_id UUID;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_existing_boosted_until TIMESTAMPTZ;
    v_new_boosted_until TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
    END IF;

    IF NOT (
        (p_duration_hours = 24 AND p_credit_cost = 50)
        OR (p_duration_hours = 72 AND p_credit_cost = 120)
        OR (p_duration_hours = 168 AND p_credit_cost = 250)
    ) THEN
        RAISE EXCEPTION 'INVALID_BOOST_PACKAGE: Geçersiz sponsor paketi.';
    END IF;

    SELECT profile.boost_credits
    INTO v_current_credits
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND: Kullanıcı profili bulunamadı.';
    END IF;

    IF v_current_credits < p_credit_cost THEN
        RAISE EXCEPTION
            'INSUFFICIENT_CREDITS: Yetersiz kredi bakiyesi. Gereken: %, Mevcut: %',
            p_credit_cost,
            v_current_credits;
    END IF;

    SELECT listing.seller_id, listing.boosted_until
    INTO v_seller_id, v_existing_boosted_until
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id
      AND listing.status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Aktif proje bulunamadı.';
    END IF;

    IF v_seller_id <> v_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN: Yalnızca kendi projenizi sponsorlayabilirsiniz.';
    END IF;

    v_new_boosted_until := GREATEST(
        COALESCE(v_existing_boosted_until, NOW()),
        NOW()
    ) + MAKE_INTERVAL(hours => p_duration_hours);
    v_new_credits := v_current_credits - p_credit_cost;

    UPDATE public.profiles
    SET boost_credits = v_new_credits
    WHERE id = v_user_id;

    UPDATE public.listings
    SET boosted_until = v_new_boosted_until,
        updated_at = NOW()
    WHERE id = p_listing_id;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        type,
        description
    ) VALUES (
        v_user_id,
        -p_credit_cost,
        v_new_credits,
        'spend_boost',
        p_duration_hours || ' saat Sponsorlu Vitrin görünürlüğü'
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'new_credits', v_new_credits,
        'boosted_until', v_new_boosted_until
    );
END;
$$;

REVOKE ALL ON FUNCTION public.boost_listing_with_credits(UUID, INTEGER, INTEGER)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.boost_listing_with_credits(UUID, INTEGER, INTEGER)
    TO authenticated;

COMMENT ON FUNCTION public.boost_listing_with_credits(UUID, INTEGER, INTEGER) IS
'Sabit premium paketlerle kredi harcar; sponsorlar saatlik eşit rotasyona katılır.';
