-- ==============================================================================
-- FAZ 9: SUPABASE REALTIME & WEBSOCKET DINLEME KALKANI (SEC-031 — SEC-033)
-- ==============================================================================
-- 1. SEC-031: Supabase Realtime Publication CDC İzolasyonu & PII Sızıntı Kalkanı
-- 2. SEC-032: WebSocket Realtime Channel Dinleme & Katılımcı Doğrulama Kalkanı
-- 3. SEC-033: Realtime Broadcast / Presence Flooding & Replikasyon Bütünlüğü
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-031: Hassas Tabloları Realtime Yayınından (supabase_realtime) Çıkarma
-- ------------------------------------------------------------------------------
-- Siparişler (orders), teklifler (offers), kullanıcı adresleri (user_addresses),
-- denetim izleri (admin_action_audit), kredi hareketleri (credit_transactions),
-- yasal onaylar (user_consents) ve şikayetler (reports) istemci websocket
-- yayınına ASLA CDC replikasyonu olarak verilmemelidir.
DO $$
BEGIN
    -- orders
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
    END IF;

    -- offers
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.offers;
    END IF;

    -- user_addresses
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_addresses'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_addresses;
    END IF;

    -- admin_action_audit
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_action_audit'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_action_audit;
    END IF;

    -- credit_transactions
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'credit_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_transactions;
    END IF;

    -- user_consents
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_consents'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.user_consents;
    END IF;

    -- reports
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SEC-032 & SEC-033: Gerekli Realtime Tabloları & REPLICA IDENTITY FULL
-- ------------------------------------------------------------------------------
-- Supabase Realtime'ın RLS kurallarını UPDATE ve DELETE olaylarında doğru
-- değerlendirebilmesi için primary key dışındaki sütunların (buyer_id, seller_id,
-- conversation_id, listing_id vb.) replikasyon akışında yer alması şarttır.
-- Aksi halde RLS motoru olayları eksik filtreleyebilir veya yetkisiz kullanıcılara
-- payload iletebilir.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.project_comments REPLICA IDENTITY FULL;

-- Meşru istemci tablolarının yayında olduğunu garantiye al
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Bildirim & Log
-- ------------------------------------------------------------------------------
COMMENT ON PUBLICATION supabase_realtime IS 'KISTAS Sertleştirilmiş Realtime CDC Yayını: Yalnızca messages, conversations ve project_comments izinlidir; PII ve finansal tablolar yalıtılmıştır.';
