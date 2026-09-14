-- RevenueCat / Apple IAP / Google Play Billing kredi teslim günlüğü.
-- İstemci bu tabloya veya RPC'ye yazamaz; yalnız service_role çağırabilir.

CREATE TABLE IF NOT EXISTS public.credit_purchase_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider = 'revenuecat'),
    provider_event_id TEXT NOT NULL,
    provider_transaction_id TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL,
    requested_credit_delta INTEGER NOT NULL CHECK (requested_credit_delta <> 0),
    applied_credit_delta INTEGER NOT NULL,
    unrecovered_credit_amount INTEGER NOT NULL DEFAULT 0 CHECK (unrecovered_credit_amount >= 0),
    store TEXT NOT NULL CHECK (store IN ('APP_STORE', 'PLAY_STORE')),
    environment TEXT NOT NULL CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_purchase_events_user_created
ON public.credit_purchase_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_purchase_events_transaction
ON public.credit_purchase_events(provider_transaction_id)
WHERE provider_transaction_id IS NOT NULL;

ALTER TABLE public.credit_purchase_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own credit purchase events"
ON public.credit_purchase_events;

CREATE POLICY "Users view own credit purchase events"
ON public.credit_purchase_events
FOR SELECT
USING (auth.uid() = user_id);

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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_expected_credits INTEGER;
    v_current_credits INTEGER;
    v_new_credits INTEGER;
    v_applied_delta INTEGER;
    v_unrecovered INTEGER := 0;
    v_inserted_event_id UUID;
BEGIN
    IF p_provider_event_id IS NULL OR LENGTH(TRIM(p_provider_event_id)) = 0 THEN
        RAISE EXCEPTION 'INVALID_EVENT_ID';
    END IF;

    v_expected_credits := CASE p_product_id
        WHEN 'kistas_credits_100' THEN 100
        WHEN 'kistas_credits_350' THEN 350
        WHEN 'kistas_credits_1000' THEN 1000
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
        RETURN jsonb_build_object(
            'success', TRUE,
            'duplicate', TRUE,
            'new_credits', v_current_credits
        );
    END IF;

    UPDATE public.profiles
    SET boost_credits = v_new_credits,
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        type,
        description
    ) VALUES (
        p_user_id,
        v_applied_delta,
        v_new_credits,
        CASE WHEN p_credit_delta > 0 THEN 'purchase'::credit_tx_type ELSE 'refund'::credit_tx_type END,
        CASE
            WHEN p_credit_delta > 0 THEN 'Mağaza kredi satın alımı: ' || p_product_id
            ELSE 'Mağaza satın alma iadesi: ' || p_product_id
        END
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

REVOKE ALL ON TABLE public.credit_purchase_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.credit_purchase_events TO authenticated;

REVOKE ALL ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;

COMMENT ON FUNCTION public.apply_revenuecat_credit_event(
    TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ
) IS 'Doğrulanmış RevenueCat kredi satın alma/iade olayını idempotent ve atomik olarak uygular.';
