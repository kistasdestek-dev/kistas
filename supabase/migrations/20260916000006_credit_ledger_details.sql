-- Kredi cüzdanı hareketlerini satın alma tutarı ve harcama hedefiyle zenginleştirir.
-- Tüm okuma erişimi mevcut kullanıcı-sahibi RLS politikasıyla sınırlı kalır.

ALTER TABLE public.credit_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.credit_transactions'::regclass
          AND conname = 'credit_transactions_metadata_object_check'
    ) THEN
        ALTER TABLE public.credit_transactions
        ADD CONSTRAINT credit_transactions_metadata_object_check
        CHECK (jsonb_typeof(metadata) = 'object');
    END IF;
END;
$$;

-- Daha önce oluşmuş Shopier yüklemelerine ödenen tutarı güvenilir sipariş kaydından ekler.
UPDATE public.credit_transactions AS transaction
SET metadata = jsonb_build_object(
    'provider', 'shopier',
    'product_id', event.product_id,
    'amount_minor', event.amount_minor,
    'currency', event.currency
)
FROM public.shopier_credit_purchase_events AS event
WHERE transaction.user_id = event.user_id
  AND transaction.type = 'purchase'::public.credit_tx_type
  AND transaction.description = 'Shopier kredi satın alımı: ' || event.product_id || ' / ' || event.provider_order_id
  AND transaction.metadata = '{}'::JSONB;

CREATE OR REPLACE FUNCTION public.apply_shopier_credit_event(
    p_order_id TEXT,
    p_user_id UUID,
    p_product_id TEXT,
    p_credit_delta INTEGER,
    p_amount_minor INTEGER,
    p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expected_credits INTEGER;
    v_expected_amount_minor INTEGER;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_inserted_event_id UUID;
    v_existing_event public.shopier_credit_purchase_events%ROWTYPE;
BEGIN
    IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_-]{1,128}$' THEN
        RAISE EXCEPTION 'INVALID_ORDER_ID';
    END IF;

    SELECT expected.credits, expected.amount_minor
    INTO v_expected_credits, v_expected_amount_minor
    FROM (
        VALUES
            ('50900373'::TEXT, 100, 29900),
            ('50900401'::TEXT, 350, 69900),
            ('50900419'::TEXT, 1000, 169900)
    ) AS expected(product_id, credits, amount_minor)
    WHERE expected.product_id = p_product_id;

    IF v_expected_credits IS NULL
       OR p_credit_delta <> v_expected_credits
       OR p_amount_minor <> v_expected_amount_minor
       OR p_currency <> 'TRY' THEN
        RAISE EXCEPTION 'PRODUCT_OR_AMOUNT_MISMATCH';
    END IF;

    INSERT INTO public.shopier_credit_purchase_events (
        provider_order_id, user_id, product_id, credit_delta, amount_minor, currency
    ) VALUES (
        p_order_id, p_user_id, p_product_id, p_credit_delta, p_amount_minor, p_currency
    )
    ON CONFLICT (provider_order_id) DO NOTHING
    RETURNING id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
        SELECT event.*
        INTO v_existing_event
        FROM public.shopier_credit_purchase_events AS event
        WHERE event.provider_order_id = p_order_id;

        IF v_existing_event.user_id <> p_user_id
           OR v_existing_event.product_id <> p_product_id
           OR v_existing_event.credit_delta <> p_credit_delta
           OR v_existing_event.amount_minor <> p_amount_minor
           OR v_existing_event.currency <> p_currency THEN
            RAISE EXCEPTION 'ORDER_REPLAY_MISMATCH';
        END IF;

        RETURN jsonb_build_object('success', TRUE, 'duplicate', TRUE);
    END IF;

    SELECT profile.boost_credits
    INTO v_current_credits
    FROM public.profiles AS profile
    WHERE profile.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    v_new_credits := v_current_credits + p_credit_delta;

    UPDATE public.profiles
    SET boost_credits = v_new_credits,
        updated_at = timezone('utc', now())
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, type, description, metadata
    ) VALUES (
        p_user_id,
        p_credit_delta,
        v_new_credits,
        'purchase'::public.credit_tx_type,
        'Shopier kredi satın alımı: ' || p_product_id || ' / ' || p_order_id,
        jsonb_build_object(
            'provider', 'shopier',
            'product_id', p_product_id,
            'amount_minor', p_amount_minor,
            'currency', p_currency
        )
    );

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        p_user_id,
        'credit_purchase',
        'Kredilerin hesabına yüklendi ✨',
        format('%s Vitrin Kredisi hesabına eklendi. Yeni bakiyen: %s kredi.', p_credit_delta, v_new_credits),
        jsonb_build_object(
            'source', 'shopier',
            'credits', p_credit_delta,
            'balance_after', v_new_credits
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'duplicate', FALSE,
        'new_credits', v_new_credits
    );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) TO service_role;

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
    v_listing_title TEXT;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_existing_boosted_until TIMESTAMPTZ;
    v_new_boosted_until TIMESTAMPTZ;
    v_clean_scope TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum acmalisiniz.';
    END IF;

    v_clean_scope := lower(trim(coalesce(p_scope, 'global')));
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

    SELECT
        listing.seller_id,
        listing.title,
        CASE
            WHEN v_clean_scope = 'global' THEN listing.boosted_until
            ELSE listing.category_boosted_until
        END
    INTO v_seller_id, v_listing_title, v_existing_boosted_until
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
        user_id, amount, balance_after, type, description, metadata, created_at
    ) VALUES (
        v_user_id,
        -p_credit_cost,
        v_new_credits,
        'spend_boost'::public.credit_tx_type,
        CASE
            WHEN v_clean_scope = 'global' THEN 'Genel Kesfet Vitrini (' || p_duration_hours || ' saat)'
            ELSE 'Kategori Vitrini (' || p_duration_hours || ' saat)'
        END,
        jsonb_build_object(
            'listing_id', p_listing_id,
            'listing_title', v_listing_title,
            'scope', v_clean_scope,
            'duration_hours', p_duration_hours
        ),
        clock_timestamp()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'new_credits', v_new_credits,
        'scope', v_clean_scope,
        'boosted_until', v_new_boosted_until
    );
END;
$$;

REVOKE ALL ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

COMMENT ON COLUMN public.credit_transactions.metadata IS
'Kredi hareketinin ödeme veya harcama hedefi gibi kullanıcıya gösterilecek yapılandırılmış ayrıntıları.';

COMMENT ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) IS 'Dogrulanmis Shopier siparisini odeme ayrintili kredi hareketine ve tekil bildirime donusturur.';

COMMENT ON FUNCTION public.boost_listing_scoped(UUID, TEXT, INTEGER, INTEGER) IS
'Vitrin kredisini atomik harcar; islem sonrasi bakiyeyi ve proje hedefini kredi hareketine kaydeder.';
