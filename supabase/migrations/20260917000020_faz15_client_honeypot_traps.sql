-- ==============================================================================
-- FAZ 15.3: İSTEMCİ & EDGE BAL KÜPÜ (CLIENT HONEYPOT TRAPS & DECOYS) (SEC-053)
-- ==============================================================================
-- 1. report_client_honeypot_trap RPC:
--    - Tarayıcı veya bot fuzzer tuzak rotaları (/env, /admin-debug) veya gizli
--      form tuzaklarına (honeypot fields) bastığında tetiklenir.
--    - Anonim ve kimliği doğrulanmış tüm rollere açıktır (SECURITY DEFINER).
--    - Saldırganı sessizce security_threat_events ve security_quarantine_blocklist
--      tablolarına ekler.
--    - Saldırgana şüphe uyandırmayacak sahte bir 200 OK başarı yanıtı döner.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.report_client_honeypot_trap(
    p_trap_type TEXT,
    p_tool_fingerprint TEXT DEFAULT 'Automated Bot Crawler',
    p_payload TEXT DEFAULT '',
    p_client_ip TEXT DEFAULT NULL,
    p_auto_quarantine BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor UUID := auth.uid();
    v_clean_type TEXT := SUBSTR(COALESCE(p_trap_type, 'CANARY_PROBE'), 1, 64);
    v_clean_tool TEXT := SUBSTR(COALESCE(p_tool_fingerprint, 'Automated Bot Crawler'), 1, 64);
    v_clean_payload TEXT := SUBSTR(COALESCE(p_payload, 'No Payload Recorded'), 1, 2048);
    v_clean_ip TEXT := SUBSTR(COALESCE(p_client_ip, '127.0.0.1'), 1, 64);
    v_action TEXT := CASE WHEN p_auto_quarantine THEN 'QUARANTINED' ELSE 'HONEYPOT_DECEIVED' END;
    v_event_id UUID;
BEGIN
    -- 1. Tehdit İstihbarat Radarına Kaydet
    INSERT INTO public.security_threat_events (
        threat_actor_id,
        ip_address,
        user_agent,
        tool_fingerprint,
        attack_vector,
        severity,
        payload_snapshot,
        action_taken,
        is_quarantined
    ) VALUES (
        v_actor,
        v_clean_ip,
        'Honeypot Client Sensor',
        v_clean_tool,
        v_clean_type,
        'CRITICAL',
        v_clean_payload,
        v_action,
        p_auto_quarantine
    )
    RETURNING id INTO v_event_id;

    -- 2. Otomatik Karantina İstenmişse WAF Bloklistesine Yaz
    IF p_auto_quarantine THEN
        INSERT INTO public.security_quarantine_blocklist (
            ip_address,
            user_id,
            reason,
            is_active
        ) VALUES (
            v_clean_ip,
            v_actor,
            'Otomatik Bal Küpü Tuzağı: ' || v_clean_type || ' (' || v_clean_tool || ')',
            true
        )
        ON CONFLICT (ip_address) DO UPDATE SET
            is_active = true,
            user_id = COALESCE(EXCLUDED.user_id, public.security_quarantine_blocklist.user_id),
            reason = EXCLUDED.reason,
            quarantined_at = NOW();
    END IF;

    -- 3. Geriye dönük uyumluluk için honeypot günlüğüne de kaydet
    BEGIN
        INSERT INTO public.security_honeypot_detections (
            trap_name,
            caller_uid,
            payload
        ) VALUES (
            v_clean_type,
            v_actor,
            v_clean_payload
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 4. Otonom Şişme Kalkanı: 14 günden eski pasif kayıtları temizle
    DELETE FROM public.security_threat_events
    WHERE detected_at < NOW() - INTERVAL '14 days'
      AND is_quarantined = false;

    -- 5. Saldırgana inandırıcı ve şüphe uyandırmayacak aldatma yanıtı dön
    RETURN jsonb_build_object(
        'status', 'ok',
        'code', 'PROCESSED_SUCCESS',
        'trap_engaged', false
    );
EXCEPTION WHEN OTHERS THEN
    -- Fail-safe sessiz dönüş
    RETURN jsonb_build_object(
        'status', 'ok',
        'code', 'FALLBACK_OK'
    );
END;
$$;

-- Anonim ve kimliği doğrulanmış tüm istemcilere açık olmalıdır
REVOKE ALL ON FUNCTION public.report_client_honeypot_trap(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_honeypot_trap(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated, service_role;
