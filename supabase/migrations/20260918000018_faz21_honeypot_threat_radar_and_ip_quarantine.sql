-- ==============================================================================
-- KISTAS SAVUNMA & SİBER GÜVENLİK MİMARİSİ
-- FAZ 21 - AŞAMA 5: PARS DEVSTATE SİBER TEHDİT RADARI & OTOMATİK IP KARANTİNASI
-- ==============================================================================
-- Bu migration:
-- 1. report_client_honeypot_trap RPC'sini sunucu seviyesinde Cloudflare ve proxy
--    başlıklarıyla (cf-connecting-ip, x-forwarded-for, x-real-ip) güçlendirir.
-- 2. Doğrulanmış sunucu IP'leri için anonim botları dahi otomatik ve güvenle
--    WAF karantinasına (security_quarantine_blocklist) alır; IP spoofing ve Self-DoS'u önler.
-- 3. check_is_quarantined fonksiyonunun istemci IP'sini sunucu başlıklarından
--    otonom okuyabilmesini sağlayarak karantinaya alınan botları anında kilitler.
-- 4. admin_get_threat_events ve admin_get_threat_intel_overview fonksiyonlarını
--    bal küpü tuzaklarının (HONEYPOT) radar filtrelemesi için optimize eder.
-- ==============================================================================

-- 1. report_client_honeypot_trap Fonksiyonu (Aşama 5 Sertleştirmesi)
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
    v_headers JSONB;
    v_server_ip TEXT := NULL;
    v_user_agent TEXT := NULL;
    v_clean_ip TEXT;
    v_ip_is_server_verified BOOLEAN := FALSE;
    v_clean_type TEXT := SUBSTR(COALESCE(p_trap_type, 'CANARY_PROBE'), 1, 64);
    v_clean_tool TEXT := SUBSTR(COALESCE(p_tool_fingerprint, 'Automated Bot Crawler'), 1, 64);
    v_clean_payload TEXT := SUBSTR(COALESCE(p_payload, 'No Payload Recorded'), 1, 2048);
    v_is_whitelisted BOOLEAN := FALSE;
    v_can_quarantine_ip BOOLEAN := FALSE;
    v_can_quarantine_actor BOOLEAN := (p_auto_quarantine AND v_actor IS NOT NULL);
    v_action TEXT;
    v_event_id UUID;
BEGIN
    -- 1. PostgREST ortamından gerçek HTTP başlıklarını çek
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
    END;

    IF v_headers IS NOT NULL THEN
        v_server_ip := COALESCE(
            NULLIF(TRIM(v_headers->>'cf-connecting-ip'), ''),
            NULLIF(TRIM(SPLIT_PART(v_headers->>'x-forwarded-for', ',', 1)), ''),
            NULLIF(TRIM(v_headers->>'x-real-ip'), '')
        );
        v_user_agent := NULLIF(TRIM(v_headers->>'user-agent'), '');
    END IF;

    -- Eğer HTTP başlığından IP gelmediyse doğrudan soket IP'sini dene
    IF v_server_ip IS NULL THEN
        BEGIN
            v_server_ip := inet_client_addr()::text;
        EXCEPTION WHEN OTHERS THEN
            v_server_ip := NULL;
        END;
    END IF;

    -- Sunucu tarafından doğrulanmış IP kontrolü:
    -- Spoofing yapılamayan Cloudflare / Edge IP'si mevcutsa bunu kullan.
    IF v_server_ip IS NOT NULL AND v_server_ip NOT IN ('', '127.0.0.1', '::1') THEN
        v_clean_ip := SUBSTR(v_server_ip, 1, 64);
        v_ip_is_server_verified := TRUE;
    ELSE
        -- Geliştirme ortamı veya fallback
        v_clean_ip := SUBSTR(COALESCE(p_client_ip, '127.0.0.1'), 1, 64);
        v_ip_is_server_verified := FALSE;
    END IF;

    IF v_user_agent IS NULL THEN
        v_user_agent := 'Honeypot Client Sensor';
    END IF;

    -- Whitelist kontrolü (Cloudflare, Supabase internal, Loopback asla karantinaya alınmaz)
    v_is_whitelisted := public.is_safe_whitelisted_ip(v_clean_ip);

    -- Karantina kararı:
    -- 1. Whitelist'te olan IP asla karantinaya alınmaz (Self-DoS kalkanı).
    -- 2. Sunucu tarafından doğrulanmış gerçek IP ise bot anonim olsa dahi karantinaya alınır.
    -- 3. Eğer IP sadece istemci tarafından bildirilmişse (doğrulanmamış), masum kişilere
    --    saldırıyı önlemek için yalnızca oturum açmış kullanıcı (v_actor) varsa IP karantinasına izin verilir.
    IF p_auto_quarantine AND NOT v_is_whitelisted THEN
        IF v_ip_is_server_verified OR v_actor IS NOT NULL THEN
            v_can_quarantine_ip := TRUE;
        END IF;
    END IF;

    IF v_can_quarantine_ip OR v_can_quarantine_actor THEN
        v_action := 'QUARANTINED';
    ELSE
        v_action := 'HONEYPOT_DECEIVED';
    END IF;

    -- 2. Tehdit İstihbarat Radarına Kaydet
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
        SUBSTR(v_user_agent, 1, 255),
        v_clean_tool,
        v_clean_type,
        'CRITICAL',
        v_clean_payload,
        v_action,
        (v_can_quarantine_ip OR v_can_quarantine_actor)
    )
    RETURNING id INTO v_event_id;

    -- 3. Aktif Güvenlik Duvarı Karantina Listesine (WAF) Yaz
    IF v_can_quarantine_actor THEN
        INSERT INTO public.security_quarantine_blocklist (
            ip_address,
            threat_actor_id,
            reason,
            is_active,
            quarantined_at
        ) VALUES (
            CASE WHEN v_can_quarantine_ip THEN v_clean_ip ELSE NULL END,
            v_actor,
            'Pars Siber Tehdit Radarı Bal Küpü Tuzağı: ' || v_clean_type || ' (' || v_clean_tool || ')',
            true,
            clock_timestamp()
        )
        ON CONFLICT (threat_actor_id) DO UPDATE SET
            is_active = true,
            ip_address = COALESCE(EXCLUDED.ip_address, public.security_quarantine_blocklist.ip_address),
            reason = EXCLUDED.reason,
            quarantined_at = clock_timestamp();
    ELSIF v_can_quarantine_ip THEN
        INSERT INTO public.security_quarantine_blocklist (
            ip_address,
            threat_actor_id,
            reason,
            is_active,
            quarantined_at
        ) VALUES (
            v_clean_ip,
            NULL,
            'Pars Siber Tehdit Radarı Bal Küpü Tuzağı: ' || v_clean_type || ' (' || v_clean_tool || ')',
            true,
            clock_timestamp()
        )
        ON CONFLICT (ip_address) DO UPDATE SET
            is_active = true,
            reason = EXCLUDED.reason,
            quarantined_at = clock_timestamp();
    END IF;

    -- 4. Geriye dönük uyumluluk günlüğüne de kaydet
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

    -- 5. Otonom Şişme Kalkanı: 14 günden eski pasif kayıtları temizle
    DELETE FROM public.security_threat_events
    WHERE detected_at < NOW() - INTERVAL '14 days'
      AND is_quarantined = false;

    -- 6. Saldırgana inandırıcı ve şüphe uyandırmayacak aldatma yanıtı dön (Cyber Deception)
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


-- 2. check_is_quarantined Fonksiyonunun Başlık Destekli Sertleştirilmesi
CREATE OR REPLACE FUNCTION public.check_is_quarantined(p_ip TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_headers JSONB;
    v_client_ip TEXT := p_ip;
BEGIN
    -- Eğer istemci IP göndermemişse doğrudan sunucu başlıklarından çek
    IF v_client_ip IS NULL THEN
        BEGIN
            v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
            IF v_headers IS NOT NULL THEN
                v_client_ip := COALESCE(
                    NULLIF(TRIM(v_headers->>'cf-connecting-ip'), ''),
                    NULLIF(TRIM(SPLIT_PART(v_headers->>'x-forwarded-for', ',', 1)), ''),
                    NULLIF(TRIM(v_headers->>'x-real-ip'), '')
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_client_ip := NULL;
        END;

        IF v_client_ip IS NULL THEN
            BEGIN
                v_client_ip := inet_client_addr()::text;
            EXCEPTION WHEN OTHERS THEN
                v_client_ip := NULL;
            END;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.security_quarantine_blocklist
        WHERE is_active = true
          AND (
              (v_caller_id IS NOT NULL AND threat_actor_id = v_caller_id)
              OR (v_client_ip IS NOT NULL AND ip_address = v_client_ip)
          )
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.check_is_quarantined(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_is_quarantined(TEXT) TO anon, authenticated, service_role;


-- 3. admin_get_threat_events Fonksiyonunun Bal Küpü Filtresiyle Genişletilmesi
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
    WHERE (
        p_severity IS NULL
        OR (p_severity = 'HONEYPOT' AND (
            e.attack_vector LIKE 'HONEYPOT_%'
            OR e.attack_vector LIKE 'DECOY_%'
            OR e.attack_vector LIKE 'ROBOTS_TXT_%'
            OR e.attack_vector LIKE 'CANARY_%'
            OR e.attack_vector LIKE 'BOT_RAPID_%'
            OR e.attack_vector IN ('DOM_HONEYPOT_TRIPPED', 'STORAGE_TOKEN_HONEYPOT_TRIPPED')
        ))
        OR (p_severity <> 'HONEYPOT' AND e.severity = p_severity)
    )
    ORDER BY e.detected_at DESC
    LIMIT LEAST(p_limit, 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) TO authenticated, service_role;


-- 4. admin_get_threat_intel_overview Fonksiyonunun Hassas Bal Küpü Metrikleriyle Güncellenmesi
CREATE OR REPLACE FUNCTION public.admin_get_threat_intel_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_threats INT;
    v_honeypot_trapped INT;
    v_null_routed INT;
    v_quarantined_actors INT;
    v_top_vectors JSONB;
    v_top_tools JSONB;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Bu operasyon yönetici yetkisi gerektirir.' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_total_threats FROM public.security_threat_events;

    -- Tüm bal küpü tuzaklarını ve aldatma olaylarını kapsayan sayım
    SELECT COUNT(*) INTO v_honeypot_trapped 
    FROM public.security_threat_events 
    WHERE action_taken = 'HONEYPOT_DECEIVED'
       OR attack_vector LIKE 'HONEYPOT_%'
       OR attack_vector LIKE 'DECOY_%'
       OR attack_vector LIKE 'ROBOTS_TXT_%'
       OR attack_vector LIKE 'CANARY_%'
       OR attack_vector LIKE 'BOT_RAPID_%'
       OR attack_vector IN ('DOM_HONEYPOT_TRIPPED', 'STORAGE_TOKEN_HONEYPOT_TRIPPED');

    SELECT COUNT(*) INTO v_null_routed FROM public.security_threat_events WHERE action_taken = 'SILENT_NULL_ROUTED';

    -- Aktif karantina listesindeki toplam kural sayısı (IP + Actor)
    SELECT COUNT(*) INTO v_quarantined_actors FROM public.security_quarantine_blocklist WHERE is_active = true;

    -- En çok hedeflenen 5 saldırı vektörü
    SELECT jsonb_agg(v) INTO v_top_vectors FROM (
        SELECT attack_vector, count(*) as count
        FROM public.security_threat_events
        GROUP BY attack_vector
        ORDER BY count DESC
        LIMIT 5
    ) v;

    -- En çok kullanılan 5 pentest aracı / bot imzası
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

REVOKE ALL ON FUNCTION public.admin_get_threat_intel_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_threat_intel_overview() TO authenticated, service_role;
