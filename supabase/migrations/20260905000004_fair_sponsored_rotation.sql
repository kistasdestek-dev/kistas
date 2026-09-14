-- ============================================================================
-- FAZ 5: ADİL SPONSOR ROTASYONU VE KREDİ PAKETİ SERTLEŞTİRMESİ
-- ============================================================================

-- Aktif sponsorlar, ödenen kredi miktarından bağımsız olarak saatlik ve
-- deterministik biçimde döner. Sonuç penceresi sınırlı olsa bile döngü bütün
-- aktif sponsorları sırayla görünür kılar.
CREATE OR REPLACE FUNCTION public.get_sponsored_listings(
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 30,
    p_reference_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    project_id UUID,
    sponsor_position BIGINT,
    active_sponsor_count BIGINT,
    boosted_until TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    WITH active_sponsors AS (
        SELECT
            listing.id AS project_id,
            listing.boosted_until,
            ROW_NUMBER() OVER (
                ORDER BY listing.created_at ASC, listing.id ASC
            ) AS base_position,
            COUNT(*) OVER () AS sponsor_count
        FROM public.listings AS listing
        WHERE listing.status = 'active'
          AND listing.boosted_until > p_reference_time
          AND (p_category_id IS NULL OR listing.category_id = p_category_id)
    ),
    rotated AS (
        SELECT
            sponsor.project_id,
            MOD(
                sponsor.base_position - 1
                + sponsor.sponsor_count
                - MOD(
                    FLOOR(EXTRACT(EPOCH FROM DATE_TRUNC('hour', p_reference_time)) / 3600)::BIGINT,
                    sponsor.sponsor_count
                ),
                sponsor.sponsor_count
            ) + 1 AS sponsor_position,
            sponsor.sponsor_count AS active_sponsor_count,
            sponsor.boosted_until
        FROM active_sponsors AS sponsor
    )
    SELECT
        rotated.project_id,
        rotated.sponsor_position,
        rotated.active_sponsor_count,
        rotated.boosted_until
    FROM rotated
    ORDER BY rotated.sponsor_position ASC, rotated.project_id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_sponsored_listings(UUID, INTEGER, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sponsored_listings(UUID, INTEGER, TIMESTAMPTZ) TO anon, authenticated;

COMMENT ON FUNCTION public.get_sponsored_listings(UUID, INTEGER, TIMESTAMPTZ) IS
'Aktif sponsorları kredi tutarından bağımsız, saatlik deterministik ve eşit rotasyonla döndürür.';

-- Eski istemcilerle imzayı korur; fakat süre ve kredi bedeli artık sunucudaki
-- sabit paket eşleşmelerinden biri olmak zorundadır.
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
        (p_duration_hours = 24 AND p_credit_cost = 30)
        OR (p_duration_hours = 72 AND p_credit_cost = 75)
        OR (p_duration_hours = 168 AND p_credit_cost = 150)
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
'Yalnızca sabit paketleri kabul eder; kredi görünürlük süresi satın alır, sponsor sırası satın almaz.';
