-- ==============================================================================
-- FAZ 15: SAYRA SİBER TEHDİT İSTİHBARATI & AKTİF KARŞI-ALDATMA RADARI (SEC-049 & SEC-050)
-- ==============================================================================
-- 1. SEC-049: Saldırgan & Pentest Aracı Parmak İzi Tespiti (Scanner Fingerprint & Payload Capture)
-- 2. SEC-050: Adaptif Karantina ve Karşı-İstihbarat Yönetim Motoru (Admin Threat Radar)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tehdit ve Saldırı Günlüğü Tablosu (security_threat_events)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_threat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_actor_id UUID,
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT,
    tool_fingerprint TEXT NOT NULL DEFAULT 'Bilinmeyen Araç',
    attack_vector TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'HIGH' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    payload_snapshot TEXT NOT NULL,
    action_taken TEXT NOT NULL DEFAULT 'LOGGED' CHECK (action_taken IN ('HONEYPOT_DECEIVED', 'SILENT_NULL_ROUTED', 'LOGGED', 'QUARANTINED', 'BLOCKED')),
    is_quarantined BOOLEAN NOT NULL DEFAULT false,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- İndeksler (Sorgu Hızı İçin)
CREATE INDEX IF NOT EXISTS idx_threat_events_detected_at ON public.security_threat_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_severity ON public.security_threat_events (severity);
CREATE INDEX IF NOT EXISTS idx_threat_events_actor ON public.security_threat_events (threat_actor_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_tool ON public.security_threat_events (tool_fingerprint);

-- Sıfır Güven (Zero-Trust): Tabloyu doğrudan dış istemciye kapat
ALTER TABLE public.security_threat_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_threat_events FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. Olay Kayıt Motoru (record_security_threat_event)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_security_threat_event(
    p_threat_actor_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT NULL,
    p_tool_fingerprint TEXT DEFAULT 'Custom / Scanner Probe',
    p_attack_vector TEXT DEFAULT 'UNKNOWN_VECTOR',
    p_severity TEXT DEFAULT 'HIGH',
    p_payload_snapshot TEXT DEFAULT 'No payload provided',
    p_action_taken TEXT DEFAULT 'LOGGED'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_id UUID;
    v_actor UUID := COALESCE(p_threat_actor_id, auth.uid());
    v_clean_ip TEXT := SUBSTR(COALESCE(p_ip_address, '127.0.0.1'), 1, 64);
    v_clean_ua TEXT := SUBSTR(COALESCE(p_user_agent, 'Not Reported'), 1, 256);
    v_clean_tool TEXT := SUBSTR(COALESCE(p_tool_fingerprint, 'Scanner Probe'), 1, 64);
    v_clean_vector TEXT := SUBSTR(COALESCE(p_attack_vector, 'UNKNOWN'), 1, 64);
    v_clean_severity TEXT := CASE WHEN p_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') THEN p_severity ELSE 'HIGH' END;
    v_clean_payload TEXT := SUBSTR(COALESCE(p_payload_snapshot, ''), 1, 2048);
    v_clean_action TEXT := CASE WHEN p_action_taken IN ('HONEYPOT_DECEIVED', 'SILENT_NULL_ROUTED', 'LOGGED', 'QUARANTINED', 'BLOCKED') THEN p_action_taken ELSE 'LOGGED' END;
BEGIN
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
        v_clean_ua,
        v_clean_tool,
        v_clean_vector,
        v_clean_severity,
        v_clean_payload,
        v_clean_action,
        (v_clean_action = 'QUARANTINED')
    )
    RETURNING id INTO v_event_id;

    -- Otonom Şişme Kalkanı (Anti-Bloat Rolling Retention):
    -- 14 günden eski ve aktif karantinada olmayan logları otomatik eriterek veritabanını daima hafif tutar.
    DELETE FROM public.security_threat_events
    WHERE detected_at < NOW() - INTERVAL '14 days'
      AND is_quarantined = false;

    RETURN v_event_id;
EXCEPTION WHEN OTHERS THEN
    RETURN gen_random_uuid();
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_threat_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_security_threat_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Faz 12 Tuzaklarını Tehdit Radarına Bağlama
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.debug_elevate_admin_role(p_master_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_sanitized_key text := substr(coalesce(p_master_key, 'empty'), 1, 100);
BEGIN
    -- Tehdit İstihbarat Radarına Kaydet
    PERFORM public.record_security_threat_event(
        v_caller_id,
        '127.0.0.1',
        'Direct PostgREST API Call',
        'Trojan Escalation Fuzzer',
        'TROJAN_ADMIN_ESCALATION',
        'CRITICAL',
        'Master key attempt: ' || v_sanitized_key,
        'HONEYPOT_DECEIVED'
    );

    -- Eski log tablosuna da uyumluluk için bas
    BEGIN
        INSERT INTO public.security_honeypot_detections (
            trap_name,
            caller_uid,
            payload
        ) VALUES (
            'debug_elevate_admin_role',
            v_caller_id,
            'Attempted key: ' || v_sanitized_key
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Saldırgana inandırıcı sahte yetkilendirme yanıtı ver
    RETURN jsonb_build_object(
        'status', 'success',
        'granted_role', 'super_admin',
        'session_id', 'kistas-dbg-' || substr(md5(random()::text), 1, 8),
        'privileges', jsonb_build_array('ALL_TABLES', 'BYPASS_RLS', 'ADMIN_CONSOLE'),
        'debug_notice', 'Temporary master developer privilege active for current session.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Yönetici Tehdit Radarı RPC'leri (Yalnızca Admin Yetkisine Açık)
-- ------------------------------------------------------------------------------

-- A) Tehdit İstihbaratı Özeti
CREATE OR REPLACE FUNCTION public.admin_get_threat_intel_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller uuid := auth.uid();
    v_total_threats INT;
    v_honeypot_trapped INT;
    v_null_routed INT;
    v_quarantined_actors INT;
    v_top_vectors JSONB;
    v_top_tools JSONB;
BEGIN
    -- Sadece süper yönetici veya admin iznine sahip hesaplar çağırabilir
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Bu operasyon yönetici yetkisi gerektirir.' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_total_threats FROM public.security_threat_events;
    SELECT COUNT(*) INTO v_honeypot_trapped FROM public.security_threat_events WHERE action_taken = 'HONEYPOT_DECEIVED';
    SELECT COUNT(*) INTO v_null_routed FROM public.security_threat_events WHERE action_taken = 'SILENT_NULL_ROUTED';
    SELECT COUNT(DISTINCT threat_actor_id) INTO v_quarantined_actors FROM public.security_threat_events WHERE is_quarantined = true AND threat_actor_id IS NOT NULL;

    -- En çok denenen 5 saldırı vektörü
    SELECT jsonb_agg(v) INTO v_top_vectors FROM (
        SELECT attack_vector, count(*) as count
        FROM public.security_threat_events
        GROUP BY attack_vector
        ORDER BY count DESC
        LIMIT 5
    ) v;

    -- En çok kullanılan 5 pentest aracı / parmak izi
    SELECT jsonb_agg(t) INTO v_top_tools FROM (
        SELECT tool_fingerprint, count(*) as count
        FROM public.security_threat_events
        GROUP BY tool_fingerprint
        ORDER BY count DESC
        LIMIT 5
    ) t;

    RETURN jsonb_build_object(
        'success', true,
        'total_threats', COALESCE(v_total_threats, 0),
        'honeypot_trapped', COALESCE(v_honeypot_trapped, 0),
        'null_routed', COALESCE(v_null_routed, 0),
        'quarantined_actors', COALESCE(v_quarantined_actors, 0),
        'top_vectors', COALESCE(v_top_vectors, '[]'::jsonb),
        'top_tools', COALESCE(v_top_tools, '[]'::jsonb)
    );
END;
$$;

-- B) Ayrıntılı Tehdit Olayları Dökümü
CREATE OR REPLACE FUNCTION public.admin_get_threat_events(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_severity TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    threat_actor_id UUID,
    threat_actor_name TEXT,
    threat_actor_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    tool_fingerprint TEXT,
    attack_vector TEXT,
    severity TEXT,
    payload_snapshot TEXT,
    action_taken TEXT,
    is_quarantined BOOLEAN,
    detected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Bu operasyon yönetici yetkisi gerektirir.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.threat_actor_id,
        COALESCE(p.full_name, 'Anonim Saldırgan') as threat_actor_name,
        COALESCE(u.email::text, 'Belirtilmemiş') as threat_actor_email,
        e.ip_address,
        e.user_agent,
        e.tool_fingerprint,
        e.attack_vector,
        e.severity,
        e.payload_snapshot,
        e.action_taken,
        e.is_quarantined,
        e.detected_at
    FROM public.security_threat_events e
    LEFT JOIN public.profiles p ON p.id = e.threat_actor_id
    LEFT JOIN auth.users u ON u.id = e.threat_actor_id
    WHERE (p_severity IS NULL OR e.severity = p_severity)
    ORDER BY e.detected_at DESC
    LIMIT LEAST(p_limit, 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- C) Saldırganı Karantinaya Alma
CREATE OR REPLACE FUNCTION public.admin_quarantine_threat_actor(
    p_event_id UUID,
    p_reason TEXT DEFAULT 'Kural dışı saldırı denemesi nedeniyle karantinaya alındı.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.security_threat_events
    SET is_quarantined = true,
        action_taken = 'QUARANTINED'
    WHERE id = p_event_id
    RETURNING threat_actor_id INTO v_actor_id;

    -- Varsa saldırganın diğer tüm kayıtlarını da karantinaya çek
    IF v_actor_id IS NOT NULL THEN
        UPDATE public.security_threat_events
        SET is_quarantined = true,
            action_taken = 'QUARANTINED'
        WHERE threat_actor_id = v_actor_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tehdit aktörü başarıyla karantinaya alındı.',
        'event_id', p_event_id,
        'actor_id', v_actor_id
    );
END;
$$;

-- D) Karantinayı Kaldırma
CREATE OR REPLACE FUNCTION public.admin_release_threat_actor(
    p_event_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.security_threat_events
    SET is_quarantined = false,
        action_taken = 'LOGGED'
    WHERE id = p_event_id
    RETURNING threat_actor_id INTO v_actor_id;

    IF v_actor_id IS NOT NULL THEN
        UPDATE public.security_threat_events
        SET is_quarantined = false,
            action_taken = 'LOGGED'
        WHERE threat_actor_id = v_actor_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Karantina kaldırıldı.',
        'event_id', p_event_id,
        'actor_id', v_actor_id
    );
END;
$$;

-- İzinleri admin rolüyle mühürle
REVOKE ALL ON FUNCTION public.admin_get_threat_intel_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_threat_intel_overview() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_quarantine_threat_actor(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_quarantine_threat_actor(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_release_threat_actor(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_release_threat_actor(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Canlı Savunma Durumu: Yalnızca Gerçek Saldırı Kayıtları Gösterilir
-- ------------------------------------------------------------------------------

