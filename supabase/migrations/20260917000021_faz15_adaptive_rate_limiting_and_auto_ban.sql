-- ==============================================================================
-- FAZ 15.4: ADAPTİF HIZ SINIRI & FUZZER OTONOM KARANTİNA MOTORU (SEC-054)
-- ==============================================================================
-- 1. security_rate_limit_tracker Tablosu:
--    - IP veya kullanıcı bazlı dinamik pencere (sliding window) kayıtları tutar.
--    - 1 saatten eski kayıtlar otonom olarak silinir (Zero-Bloat).
-- 2. enforce_adaptive_rate_limit RPC:
--    - İstek limitini aşan fuzzer ve brute-force scriptlerini tespit eder.
--    - Tekrarlayan ihlal eşiği (p_auto_ban_threshold) aşıldığında aktörü
--      OTOMATİK OLARAK security_quarantine_blocklist'e ekler.
-- ==============================================================================

-- 1. Hız Sınırı Takip Tablosu
CREATE TABLE IF NOT EXISTS public.security_rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    action_type TEXT NOT NULL,
    hit_count INT NOT NULL DEFAULT 1,
    violation_count INT NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_hit TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
ON public.security_rate_limit_tracker (identifier, action_type, window_start);

ALTER TABLE public.security_rate_limit_tracker ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_rate_limit_tracker FROM PUBLIC, anon, authenticated;

-- 2. Adaptif Hız Sınırı ve Otonom Karantina Fonksiyonu
CREATE OR REPLACE FUNCTION public.enforce_adaptive_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT,
    p_max_hits INT DEFAULT 30,
    p_window_seconds INT DEFAULT 60,
    p_auto_ban_threshold INT DEFAULT 3,
    p_client_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_id TEXT := SUBSTR(TRIM(COALESCE(p_identifier, 'anonymous')), 1, 128);
    v_clean_action TEXT := SUBSTR(TRIM(COALESCE(p_action_type, 'generic_request')), 1, 64);
    v_clean_ip TEXT := SUBSTR(TRIM(COALESCE(p_client_ip, '127.0.0.1')), 1, 64);
    v_actor UUID := auth.uid();
    v_now TIMESTAMPTZ := clock_timestamp();
    v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
    
    v_record_id UUID;
    v_current_hits INT;
    v_current_violations INT;
    v_is_auto_banned BOOLEAN := FALSE;
BEGIN
    -- Halihazırda karantinadaysa doğrudan engelle
    IF EXISTS (
        SELECT 1 FROM public.security_quarantine_blocklist
        WHERE is_active = true
          AND (
              (v_clean_ip IS NOT NULL AND ip_address = v_clean_ip)
              OR (v_actor IS NOT NULL AND threat_actor_id = v_actor)
          )
    ) THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'quarantined', true,
            'reason', 'ACTIVE_WAF_QUARANTINE'
        );
    END IF;

    -- Mevcut pencere içindeki kaydı getir veya oluştur
    SELECT id, hit_count, violation_count
    INTO v_record_id, v_current_hits, v_current_violations
    FROM public.security_rate_limit_tracker
    WHERE identifier = v_clean_id
      AND action_type = v_clean_action
      AND window_start >= v_window_start
    ORDER BY window_start DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Yeni pencere başlat
        INSERT INTO public.security_rate_limit_tracker (
            identifier,
            action_type,
            hit_count,
            violation_count,
            window_start,
            last_hit
        ) VALUES (
            v_clean_id,
            v_clean_action,
            1,
            0,
            v_now,
            v_now
        );
        
        -- Temizlik kalkanı (Rolling retention: 1 saatten eski logları erit)
        DELETE FROM public.security_rate_limit_tracker
        WHERE window_start < v_now - INTERVAL '1 hour';

        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', p_max_hits - 1
        );
    ELSE
        -- Mevcut pencereyi güncelle
        v_current_hits := v_current_hits + 1;

        IF v_current_hits > p_max_hits THEN
            -- Hız sınırı aşıldı! İhlal sayacını artır
            v_current_violations := v_current_violations + 1;

            UPDATE public.security_rate_limit_tracker
            SET hit_count = v_current_hits,
                violation_count = v_current_violations,
                last_hit = v_now
            WHERE id = v_record_id;

            -- OTONOM BAN KALKANI: İhlal eşiği aşıldıysa anında karantinaya al!
            IF v_current_violations >= p_auto_ban_threshold THEN
                -- 1. Tehdit Radarına işle
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
                    'Adaptive Rate Guard',
                    'High-Frequency Fuzzer / Brute-Force Bot',
                    'BURST_FUZZER_RATE_LIMIT',
                    'CRITICAL',
                    'Hız sınırı ihlali: ' || v_clean_action || ' (' || v_current_hits || ' istek, ' || v_current_violations || ' ihlal)',
                    'QUARANTINED',
                    true
                );

                -- 2. Aktif Güvenlik Duvarı Karantinasına yaz
                INSERT INTO public.security_quarantine_blocklist (
                    ip_address,
                    threat_actor_id,
                    reason,
                    is_active
                ) VALUES (
                    v_clean_ip,
                    v_actor,
                    'Otonom Fuzzer/Spam Engeli: ' || v_clean_action || ' aşırı istek gönderimi',
                    true
                )
                ON CONFLICT (ip_address) DO UPDATE SET
                    is_active = true,
                    reason = EXCLUDED.reason,
                    quarantined_at = NOW();

                RETURN jsonb_build_object(
                    'allowed', false,
                    'quarantined', true,
                    'reason', 'ADAPTIVE_WAF_AUTO_BAN'
                );
            END IF;

            RETURN jsonb_build_object(
                'allowed', false,
                'quarantined', false,
                'retry_after_seconds', p_window_seconds,
                'reason', 'RATE_LIMITED'
            );
        ELSE
            -- Limit aşılmadı, kaydı güncelle
            UPDATE public.security_rate_limit_tracker
            SET hit_count = v_current_hits,
                last_hit = v_now
            WHERE id = v_record_id;

            RETURN jsonb_build_object(
                'allowed', true,
                'remaining', p_max_hits - v_current_hits
            );
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Fail-safe: Hata anında meşru kullanıcıyı kilitleme
    RETURN jsonb_build_object(
        'allowed', true,
        'fallback', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_adaptive_rate_limit(TEXT, TEXT, INT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_adaptive_rate_limit(TEXT, TEXT, INT, INT, INT, TEXT) TO anon, authenticated, service_role;
