-- ============================================================================
-- 20260918000014_faz19_realtime_cdc_sniffing_shield.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19 / AŞAMA 6
-- WEBSOCKET REALTIME CDC SNIFFING & DİNLEME KAÇAĞI İZOLASYONU
-- ============================================================================

-- 1. HASSAS VE GÜVENLİK TABLOLARINI SUPABASE_REALTIME YAYININDAN KESİN OLARAK DÜŞÜR
-- Bir saldırganın websocket dinleyicisi açarak güvenlik telemetrisini,
-- bal küpü verilerini veya şifreli kasa hareketlerini sniff etmesi engellenir.

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
