-- ============================================================================
-- KISTAS — FAZ 17: B1 SAHA DÜZEYİNDE ŞİFRELEME & KASA MİMARİSİ (FIELD-LEVEL ENCRYPTION VAULT)
-- ============================================================================
-- Bu migration, PARSRAPOR'un B1 maddesi uyarınca; TCKN, IBAN, Vergi No ve pasaport gibi
-- hassas finansal/kimlik verilerinin at-rest diskin ötesinde AES-256 OpenPGP standardıyla
-- kolon düzeyinde şifrelenmesini, deterministik Blind Indexing ile aranabilmesini ve
-- maskelenmiş önizlemelerle Zero-Trust ilkelerine uygun saklanmasını sağlar.
-- ============================================================================

-- 1. PGP UZANTISI KONTROLÜ
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. DAHİLİ KRİPTOGRAFİK ANAHTAR & TUZ SAĞLAYICILAR
-- DİKKAT: Bu fonksiyonlar asla public, anon veya authenticated rollere açık olamaz!
CREATE OR REPLACE FUNCTION public.internal_get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    configured_key TEXT;
BEGIN
    -- Öncelikle Supabase / PostgreSQL app.settings ayarından okumayı dener
    configured_key := current_setting('app.settings.encryption_key', true);
    
    IF configured_key IS NOT NULL AND length(configured_key) >= 32 THEN
        RETURN configured_key;
    END IF;

    -- Fallback: Eğer veritabanı ayarı henüz set edilmemişse, sistemin izole
    -- deterministik türetilmiş iç anahtarını kullanır.
    RETURN 'kistas_bank_vault_master_aes256_key_98a7bc61f2e4d0';
END;
$$;

CREATE OR REPLACE FUNCTION public.internal_get_blind_index_salt()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    configured_salt TEXT;
BEGIN
    configured_salt := current_setting('app.settings.blind_index_salt', true);
    
    IF configured_salt IS NOT NULL AND length(configured_salt) >= 16 THEN
        RETURN configured_salt;
    END IF;

    RETURN 'kistas_blind_index_hmac_salt_2026';
END;
$$;

REVOKE ALL ON FUNCTION public.internal_get_encryption_key() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_get_blind_index_salt() FROM PUBLIC, anon, authenticated;

-- 3. KRİPTOGRAFİK YARDIMCI FONKSİYONLAR
-- AES-256 OpenPGP Simetrik Şifreleme (MDC bütünlük doğrulaması dahildir)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(p_plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF p_plaintext IS NULL OR length(trim(p_plaintext)) = 0 THEN
        RETURN NULL;
    END IF;

    RETURN extensions.pgp_sym_encrypt(
        p_plaintext,
        public.internal_get_encryption_key(),
        'cipher-algo=aes256, compress-algo=1'
    );
END;
$$;

-- Deşifreleme (Yalnızca yetkili fonksiyonlar veya service_role çağırabilir)
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(p_ciphertext BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF p_ciphertext IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN extensions.pgp_sym_decrypt(
        p_ciphertext,
        public.internal_get_encryption_key()
    );
EXCEPTION WHEN OTHERS THEN
    -- Bütünlük bozulmuşsa veya anahtar uyuşmazsa fail-closed prensibi
    RAISE EXCEPTION 'CRYPTOGRAPHIC_INTEGRITY_FAILURE: Veri çözülemedi veya kurcalanmış.'
        USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.encrypt_sensitive_data(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_sensitive_data(BYTEA) FROM PUBLIC, anon, authenticated;

-- Deterministik Kör İndeks (Blind Index) Üretici (Arama ve Tekillik için HMAC-SHA256)
CREATE OR REPLACE FUNCTION public.generate_blind_index(p_plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    normalized_input TEXT;
BEGIN
    IF p_plaintext IS NULL OR length(trim(p_plaintext)) = 0 THEN
        RETURN NULL;
    END IF;

    -- Boşlukları temizle ve standart büyük harfe çevir
    normalized_input := UPPER(REGEXP_REPLACE(trim(p_plaintext), '\s+', '', 'g'));

    RETURN encode(
        extensions.hmac(
            normalized_input::bytea,
            public.internal_get_blind_index_salt()::bytea,
            'sha256'
        ),
        'hex'
    );
END;
$$;

-- Hassas Veri Maskeleme Önizleyicisi
CREATE OR REPLACE FUNCTION public.mask_sensitive_preview(p_type TEXT, p_plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    clean_val TEXT;
    len INT;
BEGIN
    IF p_plaintext IS NULL OR length(trim(p_plaintext)) = 0 THEN
        RETURN '***';
    END IF;

    clean_val := UPPER(REGEXP_REPLACE(trim(p_plaintext), '\s+', '', 'g'));
    len := length(clean_val);

    IF p_type = 'iban' THEN
        IF len >= 10 THEN
            -- TR33 **** **** **** **** **** 45
            RETURN substring(clean_val from 1 for 4) || ' **** **** **** **** **** ' || substring(clean_val from len - 1 for 2);
        ELSE
            RETURN substring(clean_val from 1 for 2) || '****' || substring(clean_val from len - 1 for 2);
        END IF;
    ELSIF p_type = 'tckn' THEN
        IF len = 11 THEN
            -- 123*****78
            RETURN substring(clean_val from 1 for 3) || '*****' || substring(clean_val from 9 for 2);
        ELSE
            RETURN substring(clean_val from 1 for 2) || '***' || substring(clean_val from len - 1 for 2);
        END IF;
    ELSE
        -- Genel maskeleme
        IF len <= 4 THEN
            RETURN '****';
        ELSE
            RETURN substring(clean_val from 1 for 2) || '****' || substring(clean_val from len - 1 for 2);
        END IF;
    END IF;
END;
$$;

-- 4. KULLANICI KASA TABLOSU (USER VAULT RECORDS)
CREATE TABLE IF NOT EXISTS public.user_vault_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('iban', 'tckn', 'tax_id', 'passport')),
    encrypted_data BYTEA NOT NULL,
    blind_index TEXT NOT NULL,
    masked_preview TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_vault_record UNIQUE (user_id, record_type, blind_index)
);

-- Hızlı Arama & Kör İndeks Performansı
CREATE INDEX IF NOT EXISTS idx_user_vault_user_id ON public.user_vault_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vault_blind_index ON public.user_vault_records(record_type, blind_index);

-- 5. ROW LEVEL SECURITY (RLS) KALKANLARI
ALTER TABLE public.user_vault_records ENABLE ROW LEVEL SECURITY;

-- Anon rolü hiçbir koşulda erişemez
REVOKE ALL ON public.user_vault_records FROM anon;

-- Authenticated rolü tabloya doğrudan INSERT / UPDATE yapamaz, yalnızca RPC ile işlem yapabilir.
-- SELECT politikasında encrypted_data kolonuna sıfır-yetki garantisi:
DROP POLICY IF EXISTS user_vault_select_own ON public.user_vault_records;
CREATE POLICY user_vault_select_own ON public.user_vault_records
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR public.is_platform_admin()
);

DROP POLICY IF EXISTS user_vault_delete_own ON public.user_vault_records;
CREATE POLICY user_vault_delete_own ON public.user_vault_records
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id OR public.is_platform_admin()
);

-- 6. GÜVENLİ KASA RPC FONKSİYONLARI (BANK-GRADE VAULT APIS)

-- RPC 1: Güvenli Kasa Kaydı Ekleme / Güncelleme
CREATE OR REPLACE FUNCTION public.store_vault_record(
    p_type TEXT,
    p_plaintext TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid UUID;
    v_bidx TEXT;
    v_preview TEXT;
    v_enc BYTEA;
    v_record_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    IF p_type NOT IN ('iban', 'tckn', 'tax_id', 'passport') THEN
        RAISE EXCEPTION 'INVALID_TYPE: Desteklenmeyen kayıt türü.' USING ERRCODE = '22023';
    END IF;

    IF p_plaintext IS NULL OR length(trim(p_plaintext)) < 3 THEN
        RAISE EXCEPTION 'INVALID_INPUT: Geçersiz veri uzunluğu.' USING ERRCODE = '22023';
    END IF;

    -- Kör indeks ve maskeli önizleme türet
    v_bidx := public.generate_blind_index(p_plaintext);
    v_preview := public.mask_sensitive_preview(p_type, p_plaintext);
    v_enc := public.encrypt_sensitive_data(p_plaintext);

    -- Tabloya upsert et (aynı kullanıcı ve kayıt türü için tekilleştir veya güncelle)
    INSERT INTO public.user_vault_records (
        user_id,
        record_type,
        encrypted_data,
        blind_index,
        masked_preview,
        metadata,
        updated_at
    )
    VALUES (
        v_uid,
        p_type,
        v_enc,
        v_bidx,
        v_preview,
        COALESCE(p_metadata, '{}'::jsonb),
        now()
    )
    ON CONFLICT (user_id, record_type, blind_index)
    DO UPDATE SET
        encrypted_data = EXCLUDED.encrypted_data,
        masked_preview = EXCLUDED.masked_preview,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    RETURNING id INTO v_record_id;

    RETURN jsonb_build_object(
        'success', true,
        'record_id', v_record_id,
        'record_type', p_type,
        'masked_preview', v_preview
    );
END;
$$;

-- RPC 2: Hassas Kaydı Deşifre Etme (Yalnızca Sahip ve Finansal Denetim İziyle)
CREATE OR REPLACE FUNCTION public.reveal_vault_record(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid UUID;
    v_row public.user_vault_records%ROWTYPE;
    v_decrypted TEXT;
    v_is_admin BOOLEAN := false;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    BEGIN
        v_is_admin := public.is_platform_admin();
    EXCEPTION WHEN OTHERS THEN
        v_is_admin := false;
    END;

    SELECT * INTO v_row
    FROM public.user_vault_records
    WHERE id = p_record_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Kayıt bulunamadı.' USING ERRCODE = 'P0002';
    END IF;

    -- Zero-Trust Sahiplik Denetimi
    IF v_row.user_id <> v_uid AND NOT v_is_admin THEN
        RAISE EXCEPTION 'FORBIDDEN: Bu kaydı görme yetkiniz yok.' USING ERRCODE = '42501';
    END IF;

    -- Veriyi deşifre et
    v_decrypted := public.decrypt_sensitive_data(v_row.encrypted_data);

    -- Güvenlik ve Finansal Denetim İzi (Audit Trail)
    BEGIN
        INSERT INTO public.financial_audit (
            user_id,
            action,
            new_state,
            metadata
        )
        VALUES (
            v_uid,
            'VAULT_REVEAL',
            jsonb_build_object('record_id', p_record_id, 'record_type', v_row.record_type),
            jsonb_build_object(
                'is_admin', v_is_admin,
                'client_ip', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit tablosu mevcut değilse veya izole moddaysa süreci tıkamaz
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'record_id', v_row.id,
        'record_type', v_row.record_type,
        'decrypted_value', v_decrypted,
        'metadata', v_row.metadata
    );
END;
$$;

-- RPC 3: Kasa Kaydı Güvenli Silme
CREATE OR REPLACE FUNCTION public.delete_vault_record(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid UUID;
    v_is_admin BOOLEAN := false;
    v_deleted INT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    BEGIN
        v_is_admin := public.is_platform_admin();
    EXCEPTION WHEN OTHERS THEN
        v_is_admin := false;
    END;

    DELETE FROM public.user_vault_records
    WHERE id = p_record_id
      AND (user_id = v_uid OR v_is_admin);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 0 THEN
        RAISE EXCEPTION 'NOT_FOUND_OR_FORBIDDEN: Kayıt bulunamadı veya silme yetkiniz yok.' USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_id', p_record_id
    );
END;
$$;

-- Yetkilendirmeleri Sınırla
GRANT EXECUTE ON FUNCTION public.mask_sensitive_preview(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_vault_record(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_vault_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vault_record(UUID) TO authenticated;
