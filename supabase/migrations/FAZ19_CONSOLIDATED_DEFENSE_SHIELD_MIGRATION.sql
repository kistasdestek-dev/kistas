-- ============================================================================
-- FAZ19_CONSOLIDATED_DEFENSE_SHIELD_MIGRATION.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19: PARS DEVSTATE 6 AŞAMALI TAM KALKAN
-- ============================================================================
-- Bu dosya Faz 19 kapsamındaki tüm savunma sertleştirmelerini tek parça halinde
-- canlı Supabase veritabanına uygulanabilir şekilde birleştirir:
--
-- Aşama 1: Savunma Mekanizmasının Silahlaştırılması Engeli (Defense Inversion & Self-DoS)
-- Aşama 2: Race Condition (TOCTOU) & Finansal/Kredi Bütünlüğü Kalkanı
-- Aşama 3: Webhook Uç Noktaları DoS & Kaynak Tüketimi Kalkanı (Edge Function)
-- Aşama 4: PostgREST Doğrudan API Kazıma & IDOR İzolasyonu
-- Aşama 5: Depolama (Storage) Polyglot Dosya & Stored XSS Kalkanı
-- Aşama 6: WebSocket Realtime CDC Sniffing & Dinleme Kaçağı İzolasyonu
-- ============================================================================

-- ----------------------------------------------------------------------------
-- AŞAMA 1: SAVUNMA MEKANİZMASININ SİLAHLAŞTIRILMASI ENGELİ (ANTI-DOS SHIELD)
-- ----------------------------------------------------------------------------

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
    IF p_auto_quarantine AND NOT v_is_whitelisted AND v_actor IS NOT NULL THEN
        v_can_quarantine_ip := TRUE;
    END IF;

    IF v_can_quarantine_ip OR v_can_quarantine_actor THEN
        v_action := 'QUARANTINED';
    ELSE
        v_action := 'HONEYPOT_DECEIVED';
    END IF;

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

    DELETE FROM public.security_threat_events
    WHERE detected_at < NOW() - INTERVAL '14 days'
      AND is_quarantined = false;

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
        
        DELETE FROM public.security_rate_limit_tracker
        WHERE window_start < v_now - INTERVAL '1 hour';

        RETURN jsonb_build_object(
            'allowed', true,
            'remaining', p_max_hits - 1
        );
    ELSE
        v_current_hits := v_current_hits + 1;

        IF v_current_hits > p_max_hits THEN
            v_current_violations := v_current_violations + 1;

            UPDATE public.security_rate_limit_tracker
            SET hit_count = v_current_hits,
                violation_count = v_current_violations,
                last_hit = v_now
            WHERE id = v_record_id;

            IF v_current_violations >= p_auto_ban_threshold THEN
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

-- ----------------------------------------------------------------------------
-- AŞAMA 2: RACE CONDITION & FİNANSAL BÜTÜNLÜK KALKANI
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_boost_credits_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_boost_credits_positive
            CHECK (boost_credits >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_available_balance_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_available_balance_positive
            CHECK (available_balance >= 0.00);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_profiles_pending_balance_positive'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT chk_profiles_pending_balance_positive
            CHECK (pending_balance >= 0.00);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_active_listing_unique
ON public.orders (listing_id)
WHERE status IN ('pending_payment', 'paid_escrow', 'shipped');

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_upvotes_unique_pair
ON public.project_upvotes (project_id, user_id);

CREATE OR REPLACE FUNCTION public.check_recent_boost_spam(
    p_user_id UUID,
    p_listing_id UUID,
    p_cooldown_seconds INT DEFAULT 3
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.credit_transactions
        WHERE user_id = p_user_id
          AND description LIKE '%' || p_listing_id::TEXT || '%'
          AND created_at > NOW() - (p_cooldown_seconds || ' seconds')::INTERVAL
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_recent_boost_spam(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_recent_boost_spam(UUID, UUID, INT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- AŞAMA 4: POSTGREST DOĞRUDAN API KAZIMA & IDOR İZOLASYON KALKANI
-- ----------------------------------------------------------------------------

REVOKE ALL ON TABLE public.user_addresses FROM anon, public;
REVOKE ALL ON TABLE public.orders FROM anon, public;
REVOKE ALL ON TABLE public.conversations FROM anon, public;
REVOKE ALL ON TABLE public.messages FROM anon, public;
REVOKE ALL ON TABLE public.notifications FROM anon, public;
REVOKE ALL ON TABLE public.user_vault_records FROM anon, public;
REVOKE ALL ON TABLE public.security_threat_events FROM anon, public;
REVOKE ALL ON TABLE public.security_quarantine_blocklist FROM anon, public;
REVOKE ALL ON TABLE public.security_rate_limit_tracker FROM anon, public;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;

CREATE POLICY "conversations_select_own" ON public.conversations
FOR SELECT TO authenticated
USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id 
    OR (listing_id IS NULL AND public.is_platform_admin())
);

DROP POLICY IF EXISTS "Messages viewable by conversation participants" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;

CREATE POLICY "messages_select_participant" ON public.messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations AS c
        WHERE c.id = public.messages.conversation_id
          AND (
              c.buyer_id = auth.uid() 
              OR c.seller_id = auth.uid() 
              OR (c.listing_id IS NULL AND public.is_platform_admin())
          )
    )
);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_select_own" ON public.user_addresses;

CREATE POLICY "user_addresses_select_own" ON public.user_addresses
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- AŞAMA 5: DEPOLAMA POLYGLOT DOSYA & STORED XSS KALKANI
-- ----------------------------------------------------------------------------

UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[],
    file_size_limit = 10485760
WHERE id = 'kistas';

DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload project images" ON storage.objects;

CREATE POLICY "object_write_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kistas'
    AND auth.role() = 'authenticated'
    AND name !~ '\.\.'
    AND name ~ '^[a-zA-Z0-9_\-\./]+$'
    AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    AND (
        metadata IS NULL 
        OR (metadata->>'mimetype') IS NULL
        OR (metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp')
    )
    AND (owner IS NULL OR owner = auth.uid())
);

DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;

CREATE POLICY "object_update_owner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'kistas'
    AND (owner = auth.uid() OR public.is_platform_admin())
)
WITH CHECK (
    bucket_id = 'kistas'
    AND (owner = auth.uid() OR public.is_platform_admin())
    AND name !~ '\.\.'
    AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
);

-- ----------------------------------------------------------------------------
-- AŞAMA 6: WEBSOCKET REALTIME CDC SNIFFING İZOLASYONU
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    -- user_vault_records
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_vault_records') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_vault_records;
    END IF;

    -- security_threat_events
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'security_threat_events') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.security_threat_events;
    END IF;

    -- security_quarantine_blocklist
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'security_quarantine_blocklist') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.security_quarantine_blocklist;
    END IF;

    -- security_honeypot_detections
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'security_honeypot_detections') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.security_honeypot_detections;
    END IF;

    -- security_rate_limit_tracker
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'security_rate_limit_tracker') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.security_rate_limit_tracker;
    END IF;

    -- system_config_keys
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_config_keys') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.system_config_keys;
    END IF;

    -- admin_credentials
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_credentials') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_credentials;
    END IF;

    -- system_debug_credentials
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_debug_credentials') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.system_debug_credentials;
    END IF;

    -- shopier_credit_purchase_events
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shopier_credit_purchase_events') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.shopier_credit_purchase_events;
    END IF;

    -- credit_purchase_events
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'credit_purchase_events') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_purchase_events;
    END IF;

    -- orders
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
    END IF;

    -- offers
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.offers;
    END IF;

    -- user_addresses
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_addresses') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_addresses;
    END IF;

    -- admin_action_audit
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_action_audit') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_action_audit;
    END IF;

    -- credit_transactions
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'credit_transactions') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_transactions;
    END IF;

    -- user_consents
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_consents') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_consents;
    END IF;

    -- reports
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports') THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    END IF;
END $$;
