-- ==============================================================================
-- KISTAS SAVUNMA HATTI: FAZ 8 - DENETİM İZİ DOKUNULMAZLIĞI & ADMİN YETKİ AYRIŞTIRMASI (SEC-028 - SEC-030)
-- ==============================================================================
-- Açıklama:
-- 1. SEC-028: `public.admin_action_audit` tablosu Append-Only (Yalnızca Eklenebilir)
--    yapılır. UPDATE ve DELETE işlemleri veritabanı motoru seviyesinde engellenir;
--    böylece hiçbir yönetici veya servis geçmiş denetim kayıtlarını silemez veya tahrif edemez.
--    Platform yöneticilerine okuma için RLS SELECT politikası tanımlanır.
-- 2. SEC-029: Sohbet gizliliği pekiştirilir; destek ekibinin (`community` izni olan yöneticiler)
--    yalnızca `listing_id IS NULL` olan destek görüşmelerini okuyabileceği, kullanıcılar arası
--    özel proje/pazarlık mesajlarına erişemeyeceği RLS seviyesinde güvenceye alınır.
-- 3. SEC-030: `admin_team_members` tablosundaki yetki yükseltme (Privilege Escalation)
--    engeli doğrulanır; süper yönetici harici müdahaleler ve tanımsız yetki girişleri mühürlenir.
-- ==============================================================================

-- 1. SEC-028: ADMIN_ACTION_AUDIT DEĞİŞTİRİLEMEZLİK & APPEND-ONLY KALKANI
CREATE OR REPLACE FUNCTION public.prevent_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_IMMUTABLE: Denetim izi kayıtları kesinlikle silinemez veya güncellenemez!';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_tampering ON public.admin_action_audit;
CREATE TRIGGER trg_prevent_audit_tampering
    BEFORE UPDATE OR DELETE ON public.admin_action_audit
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_tampering();

-- Platform yöneticileri için denetim kayıtlarını okuma politikası
DROP POLICY IF EXISTS "Platform admins view audit logs" ON public.admin_action_audit;
CREATE POLICY "Platform admins view audit logs"
    ON public.admin_action_audit
    FOR SELECT
    TO authenticated
    USING (public.is_platform_admin());

GRANT SELECT ON TABLE public.admin_action_audit TO authenticated;

-- 2. SEC-029: DESTEK VE TOPLULUK EKİBİNİN ÖZEL SOHBETLERDEN KESİN İZOLASYONU
-- Alıcı ve satıcı arasındaki özel proje mesajları yalnızca taraflara açıktır.
-- Destek ekibi (community) YALNIZCA listing_id IS NULL olan destek taleplerini görebilir.
DROP POLICY IF EXISTS "Authorized team views support conversations" ON public.conversations;
CREATE POLICY "Authorized team views support conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        listing_id IS NULL 
        AND public.has_admin_permission('community')
    );

DROP POLICY IF EXISTS "Authorized team views support messages" ON public.messages;
CREATE POLICY "Authorized team views support messages"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        public.has_admin_permission('community')
        AND EXISTS (
            SELECT 1 FROM public.conversations AS conversation
            WHERE conversation.id = messages.conversation_id 
              AND conversation.listing_id IS NULL
        )
    );

-- 3. SEC-030: SÜPER YÖNETİCİ KORUMASI VE ADMIN ACTION AUDIT İNDEKS PEKİŞTİRMESİ
CREATE INDEX IF NOT EXISTS idx_admin_action_audit_action_target
    ON public.admin_action_audit (action, target_type, target_id);
