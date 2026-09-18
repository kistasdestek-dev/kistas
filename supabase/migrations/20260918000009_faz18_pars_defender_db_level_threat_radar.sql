-- ==============================================================================
-- KISTAS — FAZ 18: PARS-DEFENDER VERİTABANI DÜZEYİ AKTİF TEHDİT RADARI (SEC-070)
-- ==============================================================================
-- 1. Otonom Tehdit Loglama ve Karşı Tedbir Fonksiyonu (public.log_security_threat_event)
-- 2. Yetkisiz Admin RPC Taramalarının Tuzağa Düşürülmesi (Admin Interceptors)
-- 3. Finansal Manipülasyon ve Rozet Sahteciliği Tuzağı (Financial Guard Interceptor)
-- 4. Bal Küpü (Canary / Honeypot) Tuzak Tabloları (admin_credentials & system_config_keys)
-- 5. Otomatik IP ve Aktör Tecrit Kapısı (Auto-Quarantine Enforcement)
-- ==============================================================================

-- 1. Otonom Tehdit Kayıt Fonksiyonu (PostgREST GUC Header Destekli)
CREATE OR REPLACE FUNCTION public.log_security_threat_event(
    p_attack_vector TEXT,
    p_severity TEXT DEFAULT 'HIGH',
    p_payload TEXT DEFAULT NULL,
    p_action_taken TEXT DEFAULT 'QUARANTINED',
    p_auto_quarantine BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_headers JSONB;
    v_ip TEXT;
    v_user_agent TEXT;
    v_tool TEXT;
    v_actor_id UUID := auth.uid();
    v_event_id UUID;
BEGIN
    -- 1. PostgREST ortamından HTTP başlıklarını çek
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        v_headers := NULL;
    END;

    IF v_headers IS NOT NULL THEN
        v_ip := COALESCE(
            v_headers->>'cf-connecting-ip',
            SPLIT_PART(v_headers->>'x-forwarded-for', ',', 1),
            v_headers->>'x-real-ip'
        );
        v_user_agent := v_headers->>'user-agent';
    END IF;

    IF v_ip IS NULL THEN
        BEGIN
            v_ip := inet_client_addr()::text;
        EXCEPTION WHEN OTHERS THEN
            v_ip := '127.0.0.1';
        END;
    END IF;

    IF v_user_agent IS NULL THEN
        v_user_agent := 'Direct SQL / Terminal / CLI Probe';
    END IF;

    -- 2. Saldırı Aracı ve Parmak İzi Tespiti (Pars / Burp / sqlmap / Python / cURL)
    IF v_user_agent ~* 'python|requests|aiohttp|urllib|httpx' THEN
        v_tool := 'Python Async / Fuzzer Script (Pars/Custom)';
    ELSIF v_user_agent ~* 'curl|wget|httpie' THEN
        v_tool := 'cURL / CLI HTTP Probe';
    ELSIF v_user_agent ~* 'sqlmap|nuclei|nikto|burp|zaproxy|ffuf|dirbuster' THEN
        v_tool := 'Automated Scanner / Exploit Engine';
    ELSIF v_user_agent ~* 'postman|insomnia' THEN
        v_tool := 'API Testing Client';
    ELSE
        v_tool := SUBSTRING(v_user_agent FROM 1 FOR 70);
    END IF;

    -- 3. Tehdit Günlüğü Tablosuna Kayıt
    INSERT INTO public.security_threat_events (
        threat_actor_id,
        ip_address,
        user_agent,
        tool_fingerprint,
        attack_vector,
        severity,
        payload_snapshot,
        action_taken,
        is_quarantined,
        detected_at
    ) VALUES (
        v_actor_id,
        v_ip,
        v_user_agent,
        v_tool,
        p_attack_vector,
        p_severity,
        p_payload,
        p_action_taken,
        p_auto_quarantine,
        clock_timestamp()
    ) RETURNING id INTO v_event_id;

    -- 4. Otonom Tecrit Kalkanı (Quarantine Blocklist)
    IF p_auto_quarantine THEN
        IF v_actor_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.security_quarantine_blocklist 
                WHERE threat_actor_id = v_actor_id AND is_active = true
            ) THEN
                INSERT INTO public.security_quarantine_blocklist (
                    threat_actor_id,
                    ip_address,
                    reason,
                    is_active,
                    created_at
                ) VALUES (
                    v_actor_id,
                    v_ip,
                    'PARS-DEFENDER: ' || p_attack_vector || ' - ' || COALESCE(p_payload, 'Otomatik tecrit uygulandı.'),
                    true,
                    clock_timestamp()
                );
            END IF;
        ELSIF v_ip IS NOT NULL AND v_ip <> '127.0.0.1' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.security_quarantine_blocklist 
                WHERE ip_address = v_ip AND is_active = true
            ) THEN
                INSERT INTO public.security_quarantine_blocklist (
                    threat_actor_id,
                    ip_address,
                    reason,
                    is_active,
                    created_at
                ) VALUES (
                    NULL,
                    v_ip,
                    'PARS-DEFENDER: IP Tabanlı ' || p_attack_vector || ' - ' || COALESCE(p_payload, 'Otomatik tecrit uygulandı.'),
                    true,
                    clock_timestamp()
                );
            END IF;
        END IF;
    END IF;

    RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_threat_event(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;


-- 2. Yetkisiz Admin RPC Taramalarının Tuzağa Düşürülmesi (Admin Interceptors)
CREATE OR REPLACE FUNCTION public.admin_clear_support_messages(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    PERFORM public.log_security_threat_event(
      p_attack_vector := 'UNAUTHORIZED_ADMIN_RPC_PROBE',
      p_severity := 'CRITICAL',
      p_payload := 'admin_clear_support_messages çağrısı (Hedef ID: ' || COALESCE(p_conversation_id::text, 'null') || ')',
      p_action_taken := 'QUARANTINED',
      p_auto_quarantine := true
    );
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.' USING ERRCODE = '42501';
  END IF;

  SELECT conversation.* INTO v_conversation FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id FOR UPDATE;

  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.' USING ERRCODE = 'P0001';
  END IF;

  IF v_conversation.closed_at IS NULL THEN
    RAISE EXCEPTION 'CONVERSATION_OPEN: Mesaj geçmişi yalnızca sonlandırılmış görüşmelerde silinebilir.' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.messages WHERE conversation_id = p_conversation_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  UPDATE public.conversations SET last_message = 'Mesaj geçmişi temizlendi.',
    buyer_unread_count = 0, seller_unread_count = 0 WHERE id = p_conversation_id;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_messages_cleared', 'conversation', p_conversation_id,
    jsonb_build_object('deleted_count', v_deleted_count, 'buyer_id', v_conversation.buyer_id));

  RETURN jsonb_build_object('success', TRUE, 'deleted_count', v_deleted_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_support_conversation(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    PERFORM public.log_security_threat_event(
      p_attack_vector := 'UNAUTHORIZED_ADMIN_RPC_PROBE',
      p_severity := 'CRITICAL',
      p_payload := 'admin_close_support_conversation çağrısı (Hedef ID: ' || COALESCE(p_conversation_id::text, 'null') || ')',
      p_action_taken := 'QUARANTINED',
      p_auto_quarantine := true
    );
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.conversations
  SET closed_at = clock_timestamp(),
      is_archived = true
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- 3. Finansal Manipülasyon ve Rozet Sahteciliği Tuzağı (Financial Guard Interceptor)
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        IF TG_OP = 'UPDATE' THEN
            IF (
                NEW.is_verified IS DISTINCT FROM OLD.is_verified
                OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
                OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
                OR NEW.boost_credits IS DISTINCT FROM OLD.boost_credits
            ) AND NOT public.is_platform_admin() THEN
                PERFORM public.log_security_threat_event(
                    p_attack_vector := 'FINANCIAL_TAMPER_ATTEMPT',
                    p_severity := 'CRITICAL',
                    p_payload := 'Yetkisiz Finansal Manipülasyon: ' || TG_OP || ' profiles (Kullanıcı: ' || COALESCE(OLD.id::text, 'anon') || 
                                 ', Bakiye: ' || COALESCE(NEW.available_balance::text, '0') || 
                                 ', Onay: ' || COALESCE(NEW.is_verified::text, 'false') || ')',
                    p_action_taken := 'QUARANTINED',
                    p_auto_quarantine := true
                );
                RAISE EXCEPTION 'FORBIDDEN: financial/verification fields are admin-only'
                    USING ERRCODE = 'P0001';
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF NOT public.is_platform_admin() THEN
                PERFORM public.log_security_threat_event(
                    p_attack_vector := 'SELF_DESTRUCT_PROFILE_WIPE',
                    p_severity := 'HIGH',
                    p_payload := 'Finansal Kayıtlı Profil Silme Girişimi: ' || COALESCE(OLD.id::text, 'anon'),
                    p_action_taken := 'QUARANTINED',
                    p_auto_quarantine := true
                );
                RAISE EXCEPTION 'FORBIDDEN: self-deletion of profile with financial records is forbidden'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


-- 4. Bal Küpü (Canary / Honeypot) Decoy Tabloları
-- Saldırgan REST API üzerinden cazip tablo taradığında sessizce yakalanır
CREATE OR REPLACE FUNCTION public.trap_canary_credentials_probe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.log_security_threat_event(
        p_attack_vector := 'CANARY_DECOY_PROBE',
        p_severity := 'CRITICAL',
        p_payload := 'Tuzak Tablo Taraması: admin_credentials decoy tablosu sorgulandı.',
        p_action_taken := 'HONEYPOT_DECEIVED',
        p_auto_quarantine := true
    );
    RETURN true;
END;
$$;

DROP VIEW IF EXISTS public.admin_credentials CASCADE;
CREATE OR REPLACE VIEW public.admin_credentials AS
SELECT
    'adm_canary_' || substr(md5(random()::text), 1, 8) AS id,
    'kistas_master_admin'::text AS username,
    'canary_trap_sec_' || encode(gen_random_bytes(16), 'hex') AS encrypted_secret,
    'ROOT_SUPERADMIN'::text AS role
WHERE public.trap_canary_credentials_probe();

GRANT SELECT ON public.admin_credentials TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.trap_canary_system_keys_probe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM public.log_security_threat_event(
        p_attack_vector := 'CANARY_DECOY_PROBE',
        p_severity := 'CRITICAL',
        p_payload := 'Tuzak Tablo Taraması: system_config_keys decoy tablosu sorgulandı.',
        p_action_taken := 'HONEYPOT_DECEIVED',
        p_auto_quarantine := true
    );
    RETURN true;
END;
$$;

DROP VIEW IF EXISTS public.system_config_keys CASCADE;
CREATE OR REPLACE VIEW public.system_config_keys AS
SELECT
    'jwt_signing_master_key'::text AS key_name,
    'canary_fake_token_do_not_use_' || encode(gen_random_bytes(16), 'hex') AS key_value,
    'production_vault'::text AS scope
WHERE public.trap_canary_system_keys_probe();

GRANT SELECT ON public.system_config_keys TO anon, authenticated;
