-- Shopier siparis e-postasini auth.users uzerinden profile kimligine guvenli bicimde baglar.

CREATE OR REPLACE FUNCTION public.apply_shopier_credit_event_by_email(
    p_order_id TEXT,
    p_user_email TEXT,
    p_product_id TEXT,
    p_credit_delta INTEGER,
    p_amount_minor INTEGER,
    p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF p_user_email IS NULL
       OR LENGTH(TRIM(p_user_email)) > 320
       OR TRIM(p_user_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
        RAISE EXCEPTION 'INVALID_USER_EMAIL';
    END IF;

    SELECT auth_user.id
    INTO v_user_id
    FROM auth.users AS auth_user
    INNER JOIN public.profiles AS profile ON profile.id = auth_user.id
    WHERE LOWER(auth_user.email) = LOWER(TRIM(p_user_email))
      AND auth_user.email_confirmed_at IS NOT NULL
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    RETURN public.apply_shopier_credit_event(
        p_order_id,
        v_user_id,
        p_product_id,
        p_credit_delta,
        p_amount_minor,
        p_currency
    );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_shopier_credit_event_by_email(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_shopier_credit_event_by_email(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) TO service_role;

COMMENT ON FUNCTION public.apply_shopier_credit_event_by_email(
    TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
) IS 'Dogrulanmis Shopier e-postasini auth.users ile esleyip atomik kredi islemine aktarir.';
