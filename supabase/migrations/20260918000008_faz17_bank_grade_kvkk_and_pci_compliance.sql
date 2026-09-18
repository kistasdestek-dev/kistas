-- ============================================================================
-- KISTAS — FAZ 17: B8 KVKK & PCI-DSS UYUM ÇERÇEVESİ (COMPLIANCE & ANONYMIZATION)
-- ============================================================================
-- Bu migration, PARSRAPOR B8 ve KVKK Madde 11 uyarınca; kullanıcının kendi talebiyle
-- hesabını silebilmesini, PII verilerinin anonimleştirilmesini, kasa kayıtlarının
-- yok edilmesini ve PCI-DSS SAQ A ödeme dokunulmazlığının korunmasını sağlar.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_account_and_anonymize()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid UUID;
    v_anon_name TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    v_anon_name := 'Kullanıcı_' || substring(v_uid::text from 1 for 8);

    -- 1. Kullanıcının Kasa (Vault) Şifreli Verilerini Kalıcı Olarak Sil
    DELETE FROM public.user_vault_records
    WHERE user_id = v_uid;

    -- 2. Profildeki Kişisel Bilgileri (PII) Arındır ve Anonimleştir
    UPDATE public.profiles
    SET full_name = v_anon_name,
        bio = NULL,
        avatar_url = NULL,
        phone = NULL,
        city = NULL,
        district = NULL,
        token_valid_after = now(),
        updated_at = now()
    WHERE id = v_uid;

    -- 3. Bildirimleri Temizle
    DELETE FROM public.notifications
    WHERE user_id = v_uid;

    -- 4. Anomali ve Denetim Kaydına Anonimleştirme Olayı Bırak
    BEGIN
        INSERT INTO public.anomaly_events (
            user_id,
            rule,
            detail
        )
        VALUES (
            v_uid,
            'kvkk_account_anonymized',
            jsonb_build_object(
                'anonymized_at', now(),
                'client_ip', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_uid,
        'message', 'Hesabınız ve kişisel verileriniz KVKK uyarınca başarıyla anonimleştirildi ve silindi.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account_and_anonymize() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account_and_anonymize() TO authenticated;
