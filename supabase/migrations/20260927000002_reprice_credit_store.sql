-- Kıstas kredi mağazası paketlerini kullanım ekonomisiyle eşleştirir.
-- Yalnız sabit Shopier ürün kimliği + kredi + tam TRY tutarı kabul edilir.

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
            ('50900373'::TEXT, 250, 29900),
            ('50900401'::TEXT, 750, 69900),
            ('50900419'::TEXT, 2000, 149900)
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

COMMENT ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) IS 'Shopier siparisini sabit urun, tam tutar ve kredi allowlistiyle atomik olarak kredi bakiyesine isler.';

CREATE OR REPLACE FUNCTION public.apply_revenuecat_credit_event(
    p_provider_event_id TEXT,
    p_provider_transaction_id TEXT,
    p_user_id UUID,
    p_product_id TEXT,
    p_credit_delta INTEGER,
    p_store TEXT,
    p_environment TEXT,
    p_occurred_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expected_credits INTEGER;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_applied_delta INTEGER;
    v_unrecovered INTEGER := 0;
    v_inserted_event_id UUID;
    v_existing_event public.credit_purchase_events%ROWTYPE;
BEGIN
    IF p_provider_event_id IS NULL OR LENGTH(TRIM(p_provider_event_id)) = 0 THEN
        RAISE EXCEPTION 'INVALID_EVENT_ID';
    END IF;

    v_expected_credits := CASE p_product_id
        WHEN 'kistas_credits_250' THEN 250
        WHEN 'kistas_credits_750' THEN 750
        WHEN 'kistas_credits_2000' THEN 2000
        ELSE NULL
    END;

    IF v_expected_credits IS NULL OR ABS(p_credit_delta) <> v_expected_credits THEN
        RAISE EXCEPTION 'INVALID_PRODUCT_OR_CREDIT_AMOUNT';
    END IF;

    IF p_store NOT IN ('APP_STORE', 'PLAY_STORE') THEN
        RAISE EXCEPTION 'INVALID_STORE';
    END IF;

    IF p_environment NOT IN ('SANDBOX', 'PRODUCTION') THEN
        RAISE EXCEPTION 'INVALID_ENVIRONMENT';
    END IF;

    SELECT profile.boost_credits
    INTO v_current_credits
    FROM public.profiles AS profile
    WHERE profile.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    IF p_credit_delta > 0 THEN
        v_applied_delta := p_credit_delta;
        v_new_credits := v_current_credits + p_credit_delta;
    ELSE
        v_applied_delta := -LEAST(v_current_credits, ABS(p_credit_delta));
        v_new_credits := v_current_credits + v_applied_delta;
        v_unrecovered := ABS(p_credit_delta) - ABS(v_applied_delta);
    END IF;

    INSERT INTO public.credit_purchase_events (
        provider,
        provider_event_id,
        provider_transaction_id,
        user_id,
        product_id,
        requested_credit_delta,
        applied_credit_delta,
        unrecovered_credit_amount,
        store,
        environment,
        occurred_at
    ) VALUES (
        'revenuecat',
        p_provider_event_id,
        p_provider_transaction_id,
        p_user_id,
        p_product_id,
        p_credit_delta,
        v_applied_delta,
        v_unrecovered,
        p_store,
        p_environment,
        p_occurred_at
    )
    ON CONFLICT (provider, provider_event_id) DO NOTHING
    RETURNING id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
        SELECT event.*
        INTO v_existing_event
        FROM public.credit_purchase_events AS event
        WHERE event.provider = 'revenuecat'
          AND event.provider_event_id = p_provider_event_id;

        IF v_existing_event.user_id IS DISTINCT FROM p_user_id
           OR v_existing_event.provider_transaction_id IS DISTINCT FROM p_provider_transaction_id
           OR v_existing_event.product_id IS DISTINCT FROM p_product_id
           OR v_existing_event.requested_credit_delta IS DISTINCT FROM p_credit_delta
           OR v_existing_event.store IS DISTINCT FROM p_store
           OR v_existing_event.environment IS DISTINCT FROM p_environment
           OR v_existing_event.occurred_at IS DISTINCT FROM p_occurred_at THEN
            RAISE EXCEPTION 'EVENT_REPLAY_MISMATCH';
        END IF;

        RETURN jsonb_build_object(
            'success', TRUE,
            'duplicate', TRUE,
            'new_credits', v_current_credits
        );
    END IF;

    UPDATE public.profiles
    SET boost_credits = v_new_credits,
        updated_at = timezone('utc', now())
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        type,
        description,
        metadata
    ) VALUES (
        p_user_id,
        v_applied_delta,
        v_new_credits,
        CASE WHEN p_credit_delta > 0 THEN 'purchase'::public.credit_tx_type ELSE 'refund'::public.credit_tx_type END,
        CASE
            WHEN p_credit_delta > 0 THEN 'Mağaza kredi satın alımı: ' || p_product_id
            ELSE 'Mağaza satın alma iadesi: ' || p_product_id
        END,
        jsonb_build_object(
            'provider', 'revenuecat',
            'product_id', p_product_id,
            'store', p_store,
            'environment', p_environment
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'duplicate', FALSE,
        'new_credits', v_new_credits,
        'applied_credit_delta', v_applied_delta,
        'unrecovered_credit_amount', v_unrecovered
    );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

COMMENT ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) IS 'Dogrulanmis RevenueCat kredi satin alma veya iade olayini yeni paket allowlistiyle idempotent ve atomik uygular.';
