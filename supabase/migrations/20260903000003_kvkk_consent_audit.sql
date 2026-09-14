-- ============================================================================
-- KVKK & GDPR LEGAL CONSENT & AUDIT LOG TABLE (SUPABASE / POSTGRESQL)
-- KVKK ve Elektronik Ticaret Kanunu (ETK) Uyum Denetim İzleri
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE consent_type AS ENUM (
        'kvkk_aydinlatma',          -- KVKK Aydınlatma Metni
        'acik_riza_metni',          -- Açık Rıza Beyanı (Pazarlama/Kişiselleştirme)
        'ticari_elektronik_ileti',  -- SMS & E-posta İletişim İzni (ETK / İYS)
        'mesafeli_satis_sozlesmesi',-- 6502 Sayılı Kanun Kapsamında Sipariş Sözleşmesi
        'kullanici_sozlesmesi'      -- Üyelik ve Pazar Yeri Kullanım Şartları
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    document_version VARCHAR(20) NOT NULL, -- Örn: "v1.0", "2026-Q1"
    is_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45),                -- Denetim için IPv4/IPv6
    user_agent TEXT,                       -- Mobil OS & App Sürümü
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    revoked_at TIMESTAMPTZ,                -- İzin geri çekilirse zaman damgası
    UNIQUE(user_id, consent_type, document_version)
);

-- RLS: Kullanıcı sadece kendi yasal izinlerini okuyabilir
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own consents" ON public.user_consents 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own consents" ON public.user_consents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Geriye dönük izin manipülasyonunu engellemek için UPDATE ve DELETE yasaktır.
-- İzin geri çekildiğinde yeni bir kayıt (is_accepted = false) veya revoke fonksiyonu kullanılır.
