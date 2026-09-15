-- Canli boost_listing_scoped fonksiyonundaki gecersiz `usage` enum degerini,
-- mevcut public.credit_tx_type icindeki dogru `spend_boost` degeriyle degistirir.
-- Fonksiyon statik olarak yeniden tanimlanir; dinamik SQL kullanilmaz.

CREATE OR REPLACE FUNCTION public.boost_listing_scoped(
    p_listing_id UUID,
    p_scope TEXT,
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
    v_category_id UUID;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_existing_boosted_until TIMESTAMPTZ;
    v_new_boosted_until TIMESTAMPTZ;
    v_clean_scope TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum acmalisiniz.';
    END IF;

    v_clean_scope := LOWER(TRIM(COALESCE(p_scope, 'global')));
    IF v_clean_scope NOT IN ('global', 'category') THEN
        RAISE EXCEPTION 'INVALID_SCOPE: Sponsorluk kapsami global veya category olmalidir.';
    END IF;

    IF v_clean_scope = 'global' THEN
        IF NOT (
            (p_duration_hours = 24 AND p_credit_cost = 200)
            OR (p_duration_hours = 72 AND p_credit_cost = 450)
            OR (p_duration_hours = 168 AND p_credit_cost = 900)
        ) THEN
            RAISE EXCEPTION 'INVALID_BOOST_PACKAGE: Gecersiz genel Kesfet sponsor paketi.';
        END IF;
    ELSE
        IF NOT (
            (p_duration_hours = 24 AND p_credit_cost = 50)
            OR (p_duration_hours = 72 AND p_credit_cost = 120)
            OR (p_duration_hours = 168 AND p_credit_cost = 250)
        ) THEN
            RAISE EXCEPTION 'INVALID_BOOST_PACKAGE: Gecersiz kategori vitrini sponsor paketi.';
        END IF;
    END IF;

    SELECT profile.boost_credits
    INTO v_current_credits
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND: Kullanici profili bulunamadi.';
    END IF;

    IF v_current_credits < p_credit_cost THEN
        RAISE EXCEPTION
            'INSUFFICIENT_CREDITS: Yetersiz kredi bakiyesi. Gereken: %, Mevcut: %',
            p_credit_cost,
            v_current_credits;
    END IF;

    SELECT listing.seller_id, listing.category_id,
           CASE WHEN v_clean_scope = 'global' THEN listing.boosted_until ELSE listing.category_boosted_until END
    INTO v_seller_id, v_category_id, v_existing_boosted_until
    FROM public.listings AS listing
    WHERE listing.id = p_listing_id
      AND listing.status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'LISTING_NOT_FOUND: Aktif proje bulunamadi.';
    END IF;

    IF v_seller_id <> v_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN: Sadece kendi projenizi sponsorlu vitrine tasiyabilirsiniz.';
    END IF;

    IF v_existing_boosted_until IS NOT NULL AND v_existing_boosted_until > clock_timestamp() THEN
        v_new_boosted_until := v_existing_boosted_until + make_interval(hours => p_duration_hours);
    ELSE
        v_new_boosted_until := clock_timestamp() + make_interval(hours => p_duration_hours);
    END IF;

    v_new_credits := v_current_credits - p_credit_cost;

    UPDATE public.profiles AS profile
    SET boost_credits = v_new_credits,
        updated_at = clock_timestamp()
    WHERE profile.id = v_user_id;

    IF v_clean_scope = 'global' THEN
        UPDATE public.listings AS listing
        SET boosted_until = v_new_boosted_until,
            updated_at = clock_timestamp()
        WHERE listing.id = p_listing_id;
    ELSE
        UPDATE public.listings AS listing
        SET category_boosted_until = v_new_boosted_until,
            updated_at = clock_timestamp()
        WHERE listing.id = p_listing_id;
    END IF;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        type,
        description,
        created_at
    )
    VALUES (
        v_user_id,
        -p_credit_cost,
        'spend_boost',
        CASE WHEN v_clean_scope = 'global'
             THEN 'Genel Kesfet Vitrini (' || p_duration_hours || ' saat)'
             ELSE 'Kategori Vitrini (' || p_duration_hours || ' saat)'
        END,
        clock_timestamp()
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_credits', v_new_credits,
        'scope', v_clean_scope,
        'boosted_until', v_new_boosted_until
    );
END;
$$;

REVOKE ALL ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) IS
'Projeleri Genel Kesfet veya Kategoriye Ozel Vitrin icin kademeli krediyle guvenli one cikarir; harcamayi spend_boost turunde kaydeder.';
