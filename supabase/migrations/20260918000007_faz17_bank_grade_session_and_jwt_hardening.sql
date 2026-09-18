-- ============================================================================
-- KISTAS — FAZ 17: B7 OTURUM VE JWT SERTLEŞTİRMESİ (SESSION & TOKEN HARDENING)
-- ============================================================================
-- Bu migration, PARSRAPOR'un B7 maddesi uyarınca; oturum hırsızlığı (session hijacking),
-- çalınmış refresh token'lar ve yetkisiz oturum kalıntılarına karşı veritabanı düzeyinde
-- anında oturum feshi (Global Session Revocation / Kill Switch) mimarisini kurar.
-- ============================================================================

-- 1. PROFILES TABLOSUNA OTURUM GEÇERLİLİK DAMGASI
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'token_valid_after'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN token_valid_after TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

-- 2. GLOBAL OTURUM İPTAL FONKSİYONU (GLOBAL SESSION REVOCATION RPC)
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_caller_uid UUID;
    v_target_uid UUID;
    v_is_admin BOOLEAN := false;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    -- Hedef kullanıcıyı belirle (Parametre boşsa kendini fesheder)
    v_target_uid := COALESCE(p_user_id, v_caller_uid);

    -- Admin kontrolü
    BEGIN
        v_is_admin := public.is_platform_admin();
    EXCEPTION WHEN OTHERS THEN
        v_is_admin := false;
    END;

    -- Başkasının oturumunu yalnızca platform admini feshedebilir
    IF v_target_uid <> v_caller_uid AND NOT v_is_admin THEN
        RAISE EXCEPTION 'FORBIDDEN: Başka bir kullanıcının oturumlarını feshetme yetkiniz yok.' USING ERRCODE = '42501';
    END IF;

    -- Oturum geçerlilik damgasını güncelle (Bu andan önce üretilen oturumlar geçersizdir)
    UPDATE public.profiles
    SET token_valid_after = now(),
        updated_at = now()
    WHERE id = v_target_uid;

    -- Güvenlik ve Anomali Günlüğüne Kaydet
    BEGIN
        INSERT INTO public.anomaly_events (
            user_id,
            rule,
            detail
        )
        VALUES (
            v_target_uid,
            'session_revocation_kill_switch',
            jsonb_build_object(
                'revoked_by', v_caller_uid,
                'is_admin', v_is_admin,
                'revocation_time', now(),
                'client_ip', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_uid,
        'revoked_at', now(),
        'message', 'Tüm aktif oturumlar başarıyla sonlandırıldı.'
    );
END;
$$;

-- 3. YETKİLENDİRME
REVOKE ALL ON FUNCTION public.revoke_user_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) TO authenticated;
