-- Rastgele bir mevcut Kistas hesabi ile tek seferlik 10 TRY Shopier kredi testi.

CREATE TABLE IF NOT EXISTS public.shopier_credit_test_slots (
    slot_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    credit_delta INTEGER NOT NULL CHECK (credit_delta > 0),
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL CHECK (currency = 'TRY'),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_order_id TEXT UNIQUE,
    consumed_at TIMESTAMPTZ
);

ALTER TABLE public.shopier_credit_test_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.shopier_credit_test_slots FROM PUBLIC, anon, authenticated;

INSERT INTO public.shopier_credit_test_slots (
    slot_id,
    product_id,
    credit_delta,
    amount_minor,
    currency,
    enabled,
    expires_at,
    consumed_order_id,
    consumed_at
) VALUES (
    'random-account-10-try',
    '50900373',
    100,
    1000,
    'TRY',
    TRUE,
    TIMEZONE('utc', NOW()) + INTERVAL '2 hours',
    NULL,
    NULL
)
ON CONFLICT (slot_id) DO UPDATE
SET enabled = TRUE,
    expires_at = EXCLUDED.expires_at,
    consumed_order_id = NULL,
    consumed_at = NULL;

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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expected_credits INTEGER;
    v_expected_amount_minor INTEGER;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_inserted_event_id UUID;
    v_existing_event public.shopier_credit_purchase_events%ROWTYPE;
    v_test_slot_id TEXT;
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
        SELECT slot.slot_id
        INTO v_test_slot_id
        FROM public.shopier_credit_test_slots AS slot
        WHERE slot.product_id = p_product_id
          AND slot.credit_delta = p_credit_delta
          AND slot.amount_minor = p_amount_minor
          AND slot.currency = p_currency
          AND (
              slot.consumed_order_id = p_order_id
              OR (
                  slot.enabled = TRUE
                  AND slot.consumed_order_id IS NULL
                  AND slot.expires_at > TIMEZONE('utc', NOW())
              )
          )
        FOR UPDATE;

        IF v_test_slot_id IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_OR_AMOUNT_MISMATCH';
        END IF;
    END IF;

    INSERT INTO public.shopier_credit_purchase_events (
        provider_order_id,
        user_id,
        product_id,
        credit_delta,
        amount_minor,
        currency
    ) VALUES (
        p_order_id,
        p_user_id,
        p_product_id,
        p_credit_delta,
        p_amount_minor,
        p_currency
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

    IF v_test_slot_id IS NOT NULL THEN
        UPDATE public.shopier_credit_test_slots
        SET enabled = FALSE,
            consumed_order_id = p_order_id,
            consumed_at = TIMEZONE('utc', NOW())
        WHERE slot_id = v_test_slot_id;
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
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, balance_after, type, description
    ) VALUES (
        p_user_id,
        p_credit_delta,
        v_new_credits,
        'purchase'::public.credit_tx_type,
        'Shopier kredi satın alımı: ' || p_product_id || ' / ' || p_order_id
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'duplicate', FALSE,
        'new_credits', v_new_credits,
        'one_time_test', v_test_slot_id IS NOT NULL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_shopier_credit_event(
    TEXT, UUID, TEXT, INTEGER, INTEGER, TEXT
) TO service_role;

COMMENT ON TABLE public.shopier_credit_test_slots IS
'Ilk gecerli 10 TRY Shopier kredi siparisinde atomik olarak tukenen gecici test kapisi.';
