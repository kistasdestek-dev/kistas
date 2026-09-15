-- Vitrin Yönetimi için kullanıcıya ait toplam kredi harcamasını güvenli ve ölçeklenebilir döndürür.
CREATE OR REPLACE FUNCTION public.get_my_visibility_credits_spent()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_spent_credits INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmalısınız.';
    END IF;

    SELECT COALESCE(SUM(ABS(credit_tx.amount)), 0)::INTEGER
    INTO v_spent_credits
    FROM public.credit_transactions AS credit_tx
    WHERE credit_tx.user_id = v_user_id
      AND credit_tx.amount < 0
      AND (
          credit_tx.type::TEXT = 'spend_boost'
          OR credit_tx.description ILIKE '%vitrin%'
          OR credit_tx.description ILIKE '%sponsorlu%'
      );

    RETURN v_spent_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_visibility_credits_spent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_visibility_credits_spent() TO authenticated;

COMMENT ON FUNCTION public.get_my_visibility_credits_spent() IS
'Oturum sahibinin vitrin görünürlüğü için bugüne kadar harcadığı toplam krediyi döndürür.';
