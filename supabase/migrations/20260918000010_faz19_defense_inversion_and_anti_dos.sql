-- ============================================================================
-- 20260918000010_faz19_defense_inversion_and_anti_dos.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19 / AŞAMA 1
-- SAVUNMA MEKANİZMASININ TERSİNE SİLAHLAŞTIRILMASI ENGELİ (DEFENSE INVERSION & ANTI-DOS SHIELD)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GÜVENLİK VE WAF ALTYAPI TABLOLARI (SELF-HEALING FOUNDATION)
-- ----------------------------------------------------------------------------

-- 1. Tehdit İstihbarat Radarı Tablosu
CREATE TABLE IF NOT EXISTS public.security_threat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_actor_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    tool_fingerprint TEXT NOT NULL DEFAULT 'Unknown Tool',
    attack_vector TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    payload_snapshot TEXT,
    action_taken TEXT NOT NULL DEFAULT 'LOGGED',
    is_quarantined BOOLEAN NOT NULL DEFAULT false,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_threat_events_detected_at ON public.security_threat_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_actor ON public.security_threat_events (threat_actor_id);
ALTER TABLE public.security_threat_events ENABLE ROW LEVEL SECURITY;

-- 2. Aktif Güvenlik Duvarı Karantina Listesi (security_quarantine_blocklist)
CREATE TABLE IF NOT EXISTS public.security_quarantine_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT,
    threat_actor_id UUID,
    reason TEXT NOT NULL DEFAULT 'Siber güvenlik ihlali ve pentest girişimi nedeniyle karantinaya alındı.',
    quarantined_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    quarantined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    released_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_quarantine_ip_active ON public.security_quarantine_blocklist (ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quarantine_actor_active ON public.security_quarantine_blocklist (threat_actor_id) WHERE is_active = true;
ALTER TABLE public.security_quarantine_blocklist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_quarantine_threat_actor') THEN
        ALTER TABLE public.security_quarantine_blocklist ADD CONSTRAINT uq_quarantine_threat_actor UNIQUE (threat_actor_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_quarantine_ip_address') THEN
        ALTER TABLE public.security_quarantine_blocklist ADD CONSTRAINT uq_quarantine_ip_address UNIQUE (ip_address);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Adaptif Hız Sınırı ve İstek Takip Tablosu
CREATE TABLE IF NOT EXISTS public.security_rate_limit_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    action_type TEXT NOT NULL,
    hit_count INT NOT NULL DEFAULT 1,
    violation_count INT NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    last_hit TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON public.security_rate_limit_tracker (identifier, action_type, window_start);
ALTER TABLE public.security_rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- 4. Bal Küpü Tespit Günlüğü Tablosu
CREATE TABLE IF NOT EXISTS public.security_honeypot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trap_name TEXT NOT NULL,
    caller_uid UUID,
    payload TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.security_honeypot_detections ENABLE ROW LEVEL SECURITY;

-- 1. IP Whitelist ve Özel Ağ Doğrulayıcısı (Whitelisted / Private IP Guard)
CREATE OR REPLACE FUNCTION public.is_safe_whitelisted_ip(p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_ip IS NULL OR TRIM(p_ip) = '' THEN
        RETURN true;
    END IF;
    
    -- Loopback koruması
    IF p_ip IN ('127.0.0.1', '::1', 'localhost') THEN
        RETURN true;
    END IF;
    
    -- RFC 1918 Özel Ağlar & Link-Local Koruması (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    IF p_ip ~ '^10\.' 
       OR p_ip ~ '^192\.168\.' 
       OR p_ip ~ '^169\.254\.' 
       OR p_ip ~ '^172\.(1[6-9]|2[0-9]|3[0-1])\.' THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_safe_whitelisted_ip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_safe_whitelisted_ip(TEXT) TO anon, authenticated, service_role;

-- 2. report_client_honeypot_trap Fonksiyonunun Sertleştirilmesi:
-- Keyfi IP parametresiyle masum kullanıcı veya altyapıların karantinaya alınmasını (Self-DoS) engeller.
-- Anonim çağrılarda IP asla doğrudan karantinaya alınmaz; yalnızca güvenlik loglarına işlenir.
-- Karantina yalnızca doğrulanmış aktörün (auth.uid()) oturumu için veya meşru admin kararıyla uygulanır.
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
    v_is_whitelisted BOOLEAN := public.is_safe_whitelisted_ip(v_clean_ip);
    v_can_quarantine_ip BOOLEAN := FALSE;
    v_can_quarantine_actor BOOLEAN := (p_auto_quarantine AND v_actor IS NOT NULL);
    v_action TEXT;
    v_event_id UUID;
BEGIN
    -- Whitelist'te olmayan ve doğrulanmış oturumdan gelen IP'ler karantina adayıdır.
    -- Anonim aktörlerin kontrolsüz IP karantinası tetiklemesi engellenir.
    IF p_auto_quarantine AND NOT v_is_whitelisted AND v_actor IS NOT NULL THEN
        v_can_quarantine_ip := TRUE;
    END IF;

    IF v_can_quarantine_ip OR v_can_quarantine_actor THEN
        v_action := 'QUARANTINED';
    ELSE
        v_action := 'HONEYPOT_DECEIVED';
    END IF;

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
        (v_can_quarantine_ip OR v_can_quarantine_actor)
    )
    RETURNING id INTO v_event_id;

    -- 2. Yalnızca meşru karantina koşullarında WAF Bloklistesine Yaz
    IF v_can_quarantine_actor THEN
        INSERT INTO public.security_quarantine_blocklist (
            ip_address,
            threat_actor_id,
            reason,
            is_active
        ) VALUES (
            CASE WHEN v_can_quarantine_ip THEN v_clean_ip ELSE NULL END,
            v_actor,
            'Otomatik Bal Küpü Tuzağı: ' || v_clean_type || ' (' || v_clean_tool || ')',
            true
        )
        ON CONFLICT (threat_actor_id) DO UPDATE SET
            is_active = true,
            ip_address = COALESCE(EXCLUDED.ip_address, public.security_quarantine_blocklist.ip_address),
            reason = EXCLUDED.reason,
            quarantined_at = NOW();
    ELSIF v_can_quarantine_ip THEN
        INSERT INTO public.security_quarantine_blocklist (
            ip_address,
            threat_actor_id,
            reason,
            is_active
        ) VALUES (
            v_clean_ip,
            NULL,
            'Otomatik Bal Küpü Tuzağı: ' || v_clean_type || ' (' || v_clean_tool || ')',
            true
        )
        ON CONFLICT (ip_address) DO UPDATE SET
            is_active = true,
            reason = EXCLUDED.reason,
            quarantined_at = NOW();
    END IF;

    -- 3. Geriye dönük uyumluluk günlüğüne de kaydet
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
    RETURN jsonb_build_object(
        'status', 'ok',
        'code', 'FALLBACK_OK'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.report_client_honeypot_trap(TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_honeypot_trap(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon, authenticated, service_role;

-- 3. enforce_adaptive_rate_limit Fonksiyonunun Sertleştirilmesi:
-- IP engellemesinde whitelist denetimi ve anon DoS koruması
CREATE OR REPLACE FUNCTION public.enforce_adaptive_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT,
    p_max_hits INT DEFAULT 10,
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
    v_actor UUID := auth.uid();
    v_now TIMESTAMPTZ := NOW();
    v_clean_id TEXT := SUBSTR(COALESCE(p_identifier, 'ANON_CLIENT'), 1, 128);
    v_clean_action TEXT := SUBSTR(COALESCE(p_action_type, 'DEFAULT_ACTION'), 1, 64);
    v_clean_ip TEXT := SUBSTR(p_client_ip, 1, 64);
    v_is_whitelisted BOOLEAN := public.is_safe_whitelisted_ip(v_clean_ip);
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
              (v_clean_ip IS NOT NULL AND NOT v_is_whitelisted AND ip_address = v_clean_ip)
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

                -- 2. Aktif Güvenlik Duvarı Karantinasına yaz (Whitelist IP korunur)
                IF v_actor IS NOT NULL THEN
                    INSERT INTO public.security_quarantine_blocklist (
                        threat_actor_id,
                        ip_address,
                        reason,
                        is_active
                    ) VALUES (
                        v_actor,
                        CASE WHEN NOT v_is_whitelisted THEN v_clean_ip ELSE NULL END,
                        'Otonom Fuzzer/Spam Engeli: ' || v_clean_action || ' aşırı istek gönderimi',
                        true
                    )
                    ON CONFLICT (threat_actor_id) DO UPDATE SET
                        is_active = true,
                        reason = EXCLUDED.reason,
                        quarantined_at = NOW();
                ELSIF NOT v_is_whitelisted AND v_clean_ip IS NOT NULL THEN
                    INSERT INTO public.security_quarantine_blocklist (
                        ip_address,
                        threat_actor_id,
                        reason,
                        is_active
                    ) VALUES (
                        v_clean_ip,
                        NULL,
                        'Otonom Fuzzer/Spam Engeli (IP): ' || v_clean_action || ' aşırı istek gönderimi',
                        true
                    )
                    ON CONFLICT (ip_address) DO UPDATE SET
                        is_active = true,
                        reason = EXCLUDED.reason,
                        quarantined_at = NOW();
                END IF;

                RETURN jsonb_build_object(
                    'allowed', false,
                    'quarantined', true,
                    'reason', 'RATE_LIMIT_AUTO_BANNED'
                );
            END IF;

            RETURN jsonb_build_object(
                'allowed', false,
                'quarantined', false,
                'remaining', 0,
                'violations', v_current_violations
            );
        ELSE
            -- Limit içinde normal istek
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
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_adaptive_rate_limit(TEXT, TEXT, INT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_adaptive_rate_limit(TEXT, TEXT, INT, INT, INT, TEXT) TO anon, authenticated, service_role;
