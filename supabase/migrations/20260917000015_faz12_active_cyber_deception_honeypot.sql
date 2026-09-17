-- ==============================================================================
-- FAZ 12: AKTİF SİBER ALDATMA, BAL KÜPÜ (HONEYPOT) & PARS TUZAĞI (SEC-040 — SEC-042)
-- ==============================================================================
-- 1. SEC-040: Bal Küpü Tablosu (Honey-Table & Canary Secrets)
-- 2. SEC-041: Truva Arka Kapısı (Trojan Debug RPC - Sahte Süper Admin)
-- 3. SEC-042: Finansal Sessiz Yutma (Silent Null-Route & Sahte 200 OK)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Tuzak Tespit Günlüğü (Saldırganları Sessizce Kaydeden Güvenli Tablo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_honeypot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trap_name TEXT NOT NULL,
    caller_uid UUID,
    payload TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.security_honeypot_detections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.security_honeypot_detections FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 1. SEC-040: Bal Küpü Tablosu (system_debug_credentials)
-- ------------------------------------------------------------------------------
-- Saldırgan veya Pars PostgREST üzerinden şema taraması yaptığında bu tabloyu
-- keşfeder. İçinde cezbedici sahte root kimlikleri ve sahte bcrypt hash'leri bulur.
CREATE TABLE IF NOT EXISTS public.system_debug_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    access_key TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production_privileged',
    last_rotation TEXT NOT NULL DEFAULT '2026-09-01T00:00:00Z'
);

ALTER TABLE public.system_debug_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public debug credentials read" ON public.system_debug_credentials;
CREATE POLICY "Public debug credentials read"
    ON public.system_debug_credentials
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Saldırganların yem tabloyu değiştirmesini veya silmesini kesinlikle engelle
REVOKE INSERT, UPDATE, DELETE ON TABLE public.system_debug_credentials FROM PUBLIC, anon, authenticated;

-- Sahte (Canary) kimlikleri yerleştir (Yalnızca yoksa ekle)
INSERT INTO public.system_debug_credentials (service_name, admin_email, access_key, password_hash)
SELECT 'internal_cluster_root', 'devops-master@kistas-internal.net', 'kistas_canary_sec_trap_892347891273918237918237', '$2b$12$CANARYTRAPxKISTASxDECEPTIONxHASHxDOxNOTxCRACKx'
WHERE NOT EXISTS (SELECT 1 FROM public.system_debug_credentials WHERE service_name = 'internal_cluster_root');

INSERT INTO public.system_debug_credentials (service_name, admin_email, access_key, password_hash)
SELECT 'database_migration_backup', 'db-backup-svc@kistas-internal.net', 'kistas_canary_db_svc_992147120391283019283019', '$2b$12$CANARYTRAPxKISTASxDECEPTIONxHASHxDBxSVCxKEYx'
WHERE NOT EXISTS (SELECT 1 FROM public.system_debug_credentials WHERE service_name = 'database_migration_backup');

-- ------------------------------------------------------------------------------
-- 2. SEC-041: Truva Arka Kapısı (debug_elevate_admin_role)
-- ------------------------------------------------------------------------------
-- PostgREST API fuzzing yapan saldırgan bu RPC'yi dener. Hata vermez; saldırgana
-- sahte süper admin oturumu ve sahte yetki dizisi döner. Gerçekte hiçbir rol
-- değişmez; saldırgan açığı buldum zannederken sessizce tuzağa kaydedilir.
CREATE OR REPLACE FUNCTION public.debug_elevate_admin_role(p_master_key text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_sanitized_key text := substr(coalesce(p_master_key, 'empty'), 1, 100);
BEGIN
    -- Tuzağa basan saldırganı kaydet
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

GRANT EXECUTE ON FUNCTION public.debug_elevate_admin_role(text) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. SEC-042: Finansal Sessiz Yutma (debug_add_test_credits)
-- ------------------------------------------------------------------------------
-- Kredi / bakiye hilesi arayan botlar veya saldırganlar için sahte başarı RPC'si.
-- 200 OK ve bakiye eklendi döner, ancak gerçek cüzdanda tek bir kuruş bile oynamaz.
CREATE OR REPLACE FUNCTION public.debug_add_test_credits(p_amount integer DEFAULT 1000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
BEGIN
    -- Tuzağa basan saldırganı kaydet
    BEGIN
        INSERT INTO public.security_honeypot_detections (
            trap_name,
            caller_uid,
            payload
        ) VALUES (
            'debug_add_test_credits',
            v_caller_id,
            'Requested amount: ' || coalesce(p_amount::text, 'null')
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Saldırgana sahte zafer dön
    RETURN jsonb_build_object(
        'status', 'success',
        'credits_added', coalesce(p_amount, 1000),
        'wallet_status', 'synced',
        'environment', 'sandbox_mode_enabled'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_add_test_credits(integer) TO anon, authenticated;

COMMENT ON TABLE public.system_debug_credentials IS 'KISTAS Canary Bal Küpü: Pars DevState ve saldırgan tarayıcıları için siber aldatma tablosu.';
COMMENT ON FUNCTION public.debug_elevate_admin_role IS 'KISTAS Truva Arka Kapısı: Sahte süper admin yanıtı veren aldatma fonksiyonu.';
COMMENT ON FUNCTION public.debug_add_test_credits IS 'KISTAS Finansal Bal Küpü: Kredi hilesi arayan botları nötralize eden sahte başarı fonksiyonu.';
