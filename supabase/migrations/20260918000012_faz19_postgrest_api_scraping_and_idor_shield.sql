-- ============================================================================
-- 20260918000012_faz19_postgrest_api_scraping_and_idor_shield.sql
-- KISTAS KALE SAVUNMA PLANI - FAZ 19 / AŞAMA 4
-- POSTGREST DOĞRUDAN API KAZIMA & IDOR İZOLASYON KALKANI (DIRECT API SCRAPING & IDOR SHIELD)
-- ============================================================================

-- 1. HASSAS TABLOLARIN ANONİM ROLDEN KESİN İZOLASYONU (ZERO-TRUST ANON STRIP)
-- Anonim rollerin doğrudan REST API üzerinden bu tabloları kazıması (scraping) imkansız kılınır.
REVOKE ALL ON TABLE public.user_addresses FROM anon, public;
REVOKE ALL ON TABLE public.orders FROM anon, public;
REVOKE ALL ON TABLE public.conversations FROM anon, public;
REVOKE ALL ON TABLE public.messages FROM anon, public;
REVOKE ALL ON TABLE public.notifications FROM anon, public;
REVOKE ALL ON TABLE public.user_vault_records FROM anon, public;
REVOKE ALL ON TABLE public.security_threat_events FROM anon, public;
REVOKE ALL ON TABLE public.security_quarantine_blocklist FROM anon, public;
REVOKE ALL ON TABLE public.security_rate_limit_tracker FROM anon, public;

-- 2. GÖRÜŞMELER (CONVERSATIONS) IDOR & KATI SAHİPLİK KURALI
-- Yalnızca görüşmenin alıcısı, satıcısı veya topluluk yöneticisi okuyabilir.
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;

CREATE POLICY "conversations_select_own" ON public.conversations
FOR SELECT TO authenticated
USING (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id 
    OR (listing_id IS NULL AND public.is_platform_admin())
);

-- 3. MESAJLAR (MESSAGES) IDOR & ERİŞİM MÜHÜRLEMESİ
-- Yalnızca ilgili görüşmenin meşru tarafları veya yetkili destek yöneticisi okuyabilir.
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

-- 4. BİLDİRİMLER (NOTIFICATIONS) SAHİPLİK VE OKUMA KORUMASI
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 5. KULLANICI ADRESLERİ (USER_ADDRESSES) SAHİPLİK KORUMASI
DROP POLICY IF EXISTS "Users can view own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "user_addresses_select_own" ON public.user_addresses;

CREATE POLICY "user_addresses_select_own" ON public.user_addresses
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
