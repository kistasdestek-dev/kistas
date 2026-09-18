-- ==============================================================================
-- FAZ 15.2: SAYRA AKTİF WAF GÜVENLİK DUVARI & ENFORCED KARANTİNA KORUMASI (SEC-050)
-- ==============================================================================
-- 1. Mock/Tatbikat Verilerinin Veritabanından Tamamen Temizlenmesi
-- 2. Aktif Güvenlik Duvarı Karantina Tablosu (public.security_quarantine_blocklist)
-- 3. Karantinaya Al / Serbest Bırak RPC'lerinin Aktif WAF ile Güçlendirilmesi
-- 4. Manuel IP Karantina ve Otomatik Erişim Engelleme Kapısı
-- ==============================================================================

-- 1. Mock/Test Verilerini Temizleme (Yalnızca Gerçek Veri Prensibi)
DELETE FROM public.security_threat_events
WHERE tool_fingerprint IN (
    'sqlmap / Automated Injector',
    'Burp Suite / Repeater Intruder',
    'Nuclei Scanner Engine',
    'Python Async Fuzzer'
) OR attack_vector IN (
    'SQL_INJECTION_PROBE',
    'TROJAN_ADMIN_ESCALATION',
    'CANARY_CREDENTIAL_LEAK',
    'SILENT_NULL_ROUTE_EXPLOIT'
);

-- 2. Aktif Güvenlik Duvarı Karantina Listesi (security_quarantine_blocklist)
CREATE TABLE IF NOT EXISTS public.security_quarantine_blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT,
    threat_actor_id UUID,
    reason TEXT NOT NULL DEFAULT 'Siber güvenlik ihlali ve pentest girişimi nedeniyle karantinaya alındı.',
    quarantined_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    released_at TIMESTAMPTZ DEFAULT NULL
);

-- Hızlı IP ve Aktör Sorgu İndeksleri
CREATE INDEX IF NOT EXISTS idx_quarantine_ip_active ON public.security_quarantine_blocklist (ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quarantine_actor_active ON public.security_quarantine_blocklist (threat_actor_id) WHERE is_active = true;

-- Sıfır Güven (Zero-Trust) RLS Kalkanı
ALTER TABLE public.security_quarantine_blocklist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_quarantine_blocklist FROM PUBLIC, anon, authenticated;

-- 3. Karantina Durumu Doğrulama Fonksiyonu (WAF Guard)
CREATE OR REPLACE FUNCTION public.check_is_quarantined(p_ip TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.security_quarantine_blocklist
        WHERE is_active = true
          AND (
              (v_caller_id IS NOT NULL AND threat_actor_id = v_caller_id)
              OR (p_ip IS NOT NULL AND ip_address = p_ip)
          )
    ) THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

-- 4. Karantinaya Alma RPC'si (Aktif WAF Engeliyle Birlikte)
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
    v_ip TEXT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Yönetici yetkisi gereklidir.' USING ERRCODE = '42501';
    END IF;

    -- Olay kaydından IP ve aktör ID'sini çek
    SELECT threat_actor_id, ip_address INTO v_actor_id, v_ip
    FROM public.security_threat_events
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Kayıt bulunamadı.');
    END IF;

    -- Olay tablosunu güncelle
    UPDATE public.security_threat_events
    SET is_quarantined = true,
        action_taken = 'QUARANTINED'
    WHERE id = p_event_id
       OR (v_ip IS NOT NULL AND ip_address = v_ip)
       OR (v_actor_id IS NOT NULL AND threat_actor_id = v_actor_id);

    -- Aktif Karantina Tablosuna Ekle
    INSERT INTO public.security_quarantine_blocklist (
        ip_address,
        threat_actor_id,
        reason,
        quarantined_by,
        is_active
    ) VALUES (
        v_ip,
        v_actor_id,
        p_reason,
        auth.uid(),
        true
    );

    -- Varsa kullanıcının yorum ve etkileşim izinlerini dondur
    IF v_actor_id IS NOT NULL THEN
        UPDATE public.profiles
        SET comment_muted_until = NOW() + INTERVAL '100 years'
        WHERE id = v_actor_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tehdit aktörü ve IP adresi aktif güvenlik duvarı karantinasına alındı.',
        'ip', v_ip,
        'actor_id', v_actor_id
    );
END;
$$;

-- 5. Karantinayı Kaldırma RPC'si
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
    v_ip TEXT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim.' USING ERRCODE = '42501';
    END IF;

    SELECT threat_actor_id, ip_address INTO v_actor_id, v_ip
    FROM public.security_threat_events
    WHERE id = p_event_id;

    -- Olay tablosunu serbest bırak
    UPDATE public.security_threat_events
    SET is_quarantined = false,
        action_taken = 'LOGGED'
    WHERE id = p_event_id
       OR (v_ip IS NOT NULL AND ip_address = v_ip)
       OR (v_actor_id IS NOT NULL AND threat_actor_id = v_actor_id);

    -- Karantina tablosunda pasife çek
    UPDATE public.security_quarantine_blocklist
    SET is_active = false,
        released_at = clock_timestamp()
    WHERE is_active = true
      AND (
          (v_ip IS NOT NULL AND ip_address = v_ip)
          OR (v_actor_id IS NOT NULL AND threat_actor_id = v_actor_id)
      );

    -- Varsa susturmayı aç
    IF v_actor_id IS NOT NULL THEN
        UPDATE public.profiles
        SET comment_muted_until = NULL
        WHERE id = v_actor_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Karantina kaldırıldı ve IP serbest bırakıldı.',
        'ip', v_ip
    );
END;
$$;

-- 6. Yöneticinin Doğrudan Manuel IP Engellemesi (WAF Kuralı)
CREATE OR REPLACE FUNCTION public.admin_manual_quarantine_ip(
    p_ip TEXT,
    p_reason TEXT DEFAULT 'Yönetici tarafından doğrudan güvenlik duvarına eklendi.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_ip TEXT := TRIM(p_ip);
    v_event_id UUID;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim.' USING ERRCODE = '42501';
    END IF;

    IF v_clean_ip IS NULL OR LENGTH(v_clean_ip) < 7 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Geçerli bir IP adresi giriniz.');
    END IF;

    -- 1. Olay radarına kaydet
    INSERT INTO public.security_threat_events (
        ip_address,
        user_agent,
        tool_fingerprint,
        attack_vector,
        severity,
        payload_snapshot,
        action_taken,
        is_quarantined
    ) VALUES (
        v_clean_ip,
        'Admin Manual WAF Intervention',
        'Yönetici Güvenlik Duvarı',
        'MANUAL_IP_BAN',
        'HIGH',
        'Yönetici tarafından engellendi: ' || COALESCE(p_reason, 'Belirtilmedi'),
        'QUARANTINED',
        true
    ) RETURNING id INTO v_event_id;

    -- 2. Aktif Bloklama Listesine Ekle
    INSERT INTO public.security_quarantine_blocklist (
        ip_address,
        reason,
        quarantined_by,
        is_active
    ) VALUES (
        v_clean_ip,
        COALESCE(p_reason, 'Yönetici WAF kuralı'),
        auth.uid(),
        true
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'IP adresi başarıyla engellendi ve karantinaya alındı.',
        'ip', v_clean_ip,
        'event_id', v_event_id
    );
END;
$$;

-- 7. Mock/Test Verilerini Sıfırlama RPC'si
CREATE OR REPLACE FUNCTION public.admin_clear_mock_threat_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted INT;
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim.' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.security_threat_events
    WHERE tool_fingerprint IN (
        'sqlmap / Automated Injector',
        'Burp Suite / Repeater Intruder',
        'Nuclei Scanner Engine',
        'Python Async Fuzzer'
    ) OR attack_vector IN (
        'SQL_INJECTION_PROBE',
        'TROJAN_ADMIN_ESCALATION',
        'CANARY_CREDENTIAL_LEAK',
        'SILENT_NULL_ROUTE_EXPLOIT'
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_count', v_deleted,
        'message', 'Tüm simülasyon/mock veriler başarıyla temizlendi. Artık yalnız gerçek veriler gösterilecek.'
    );
END;
$$;

-- İzinleri Ayarla
GRANT EXECUTE ON FUNCTION public.check_is_quarantined(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_quarantine_threat_actor(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_threat_actor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manual_quarantine_ip(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_mock_threat_events() TO authenticated;
