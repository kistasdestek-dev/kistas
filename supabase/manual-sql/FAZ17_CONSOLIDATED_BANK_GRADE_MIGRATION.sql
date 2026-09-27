-- ============================================================================
-- KISTAS — FAZ 17: PARS DEVSTATE BANK-GRADE CONSOLIDATED MIGRATION (V2 - HARDENED)
-- ============================================================================
-- Bu dosya, PARS DevState ofansif pentest raporundaki (PARSRAPOR) tüm bulguları
-- (V1, V1r, V2, V9, B3, B4, B5, B6) tek seferde ve hatasız çözen birleşik migration'dır.
-- Supabase SQL Editörü üzerinden 'service_role' bağlamında tek tıkla çalıştırılabilir.
-- ============================================================================

-- AŞAMA 1: ONBOARDING & KAYIT KURTARMA (V9 & SEC-003)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.check_profile_brand_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    normalized_name TEXT;
    is_reserved BOOLEAN := false;
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    BEGIN
        IF auth.role() = 'authenticated' AND public.is_platform_admin() THEN
            RETURN NEW;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    IF NEW.full_name IS NOT NULL THEN
        normalized_name := LOWER(TRANSLATE(NEW.full_name, 'Iİıîíïì@41!|05$', 'iiiiiiiaaiioos'));
        normalized_name := REGEXP_REPLACE(normalized_name, '[^a-z0-9]', '', 'g');

        IF normalized_name LIKE '%kistas%' THEN
            is_reserved := true;
        ELSIF NEW.full_name ~* 'k[\W_]*[ıİiîíïì1!|][\W_]*[s5$][\W_]*t[\W_]*[a@4][\W_]*[s5$]' THEN
            is_reserved := true;
        END IF;

        IF is_reserved THEN
            RAISE EXCEPTION 'FORBIDDEN: ‘Kıstas’ adı ve varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_brand_name ON public.profiles;
CREATE TRIGGER trg_check_profile_brand_name
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_brand_name();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            'Topluluk Üyesi'
        ),
        'https://pub-5d3e10585a6b46b39844142274f1ff63.r2.dev/system/kistas-logo.png',
        NEW.phone
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        updated_at = NOW()
    WHERE public.profiles.id = EXCLUDED.id;

    RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- AŞAMA 2: DEPOLAMA (STORAGE) İZOLASYONU & FOOTHOLD TEMİZLİĞİ (V2)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anon uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Public uploads allowed" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon can insert objects" ON storage.objects;
    DROP POLICY IF EXISTS "anon_insert" ON storage.objects;
    DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to kistas" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own objects" ON storage.objects;
    DROP POLICY IF EXISTS "object_delete_owner" ON storage.objects;
    DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;
    DROP POLICY IF EXISTS "object_read_public" ON storage.objects;

    CREATE POLICY "object_read_public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'kistas');

    CREATE POLICY "object_write_authenticated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'kistas'
        AND auth.role() = 'authenticated'
        AND LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
    );

    CREATE POLICY "object_delete_owner"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'kistas'
        AND (owner = auth.uid() OR public.is_platform_admin())
    );

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
    );

    BEGIN
        ALTER TABLE storage.objects DISABLE TRIGGER ALL;
        DELETE FROM storage.objects
        WHERE bucket_id = 'kistas'
          AND name IN (
            'pars_foothold_beacon.png',
            'pars_test.png',
            'pars_test_authed.png',
            'pars_postpatch_test.png',
            'pars_still_open.png',
            'final_check.png',
            'hardening_probe_1789681500.png'
          );
        ALTER TABLE storage.objects ENABLE TRIGGER ALL;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'storage.objects silme uyarısı: %', SQLERRM;
    END;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;


-- AŞAMA 3: PROFİL PII İZOLASYONU & PROFILES_PUBLIC GÖRÜNÜMÜ (V1, V1r, V6)
-- ----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.profiles FROM anon, public;
REVOKE ALL ON TABLE public.notifications FROM anon, public;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
    full_name,
    is_verified,
    city,
    district,
    bio,
    avatar_url,
    rating_average,
    rating_count,
    created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Vitrin ilişki koruması (Listing seller_id join misafirler için patlamaz)
GRANT SELECT (id, full_name, avatar_url, rating_average, rating_count, is_verified)
ON public.profiles TO anon;

DROP POLICY IF EXISTS "profiles_anon_active_seller_read" ON public.profiles;
CREATE POLICY "profiles_anon_active_seller_read" ON public.profiles
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.listings
        WHERE public.listings.seller_id = public.profiles.id
          AND public.listings.status = 'active'
    )
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by public and creators" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by non-blocked users" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR public.is_platform_admin()
    OR EXISTS (
        SELECT 1 FROM public.listings
        WHERE public.listings.seller_id = public.profiles.id
          AND public.listings.status = 'active'
    )
);

GRANT SELECT ON public.listings,
                 public.project_comments,
                 public.project_upvotes,
                 public.listing_images,
                 public.blog_posts,
                 public.categories
    TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;


-- AŞAMA 4: BANKA DÜZEYİ FİNANSAL BÜTÜNLÜK, DENETİM & ANOMALİ RADARI (B3, B4, B5, B6)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
                RAISE EXCEPTION 'FORBIDDEN: financial/verification fields are admin-only'
                    USING ERRCODE = 'P0001';
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF NOT public.is_platform_admin() THEN
                RAISE EXCEPTION 'FORBIDDEN: self-deletion of profile with financial records is forbidden'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_financial ON public.profiles;
CREATE TRIGGER trg_guard_financial
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_financial_columns();

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS chk_no_negative_balance;

ALTER TABLE public.profiles
    ADD CONSTRAINT chk_no_negative_balance
    CHECK (available_balance >= 0 AND pending_balance >= 0 AND boost_credits >= 0);

ALTER TABLE public.credit_transactions
    ADD COLUMN IF NOT EXISTS request_id TEXT,
    ADD COLUMN IF NOT EXISTS direction TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.credit_transactions'::regclass
          AND conname = 'chk_credit_tx_direction'
    ) THEN
        ALTER TABLE public.credit_transactions
        ADD CONSTRAINT chk_credit_tx_direction
        CHECK (direction IS NULL OR direction IN ('credit', 'debit'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financial_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor UUID,
    actor_email TEXT,
    table_name TEXT NOT NULL,
    row_id UUID,
    op TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    request_id TEXT,
    prev_hash TEXT,
    row_hash TEXT
);

ALTER TABLE public.financial_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_audit FROM anon, public;
GRANT INSERT, SELECT ON public.financial_audit TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.financial_audit FROM authenticated, anon, public;

CREATE OR REPLACE FUNCTION public._audit_hash(p_prev TEXT, p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(extensions.digest(COALESCE(p_prev, 'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    p_prev TEXT;
    p_payload JSONB;
    v_actor UUID;
    v_email TEXT;
BEGIN
    v_actor := auth.uid();
    
    SELECT row_hash INTO p_prev
    FROM public.financial_audit
    ORDER BY id DESC
    LIMIT 1;

    IF v_actor IS NOT NULL THEN
        SELECT email INTO v_email
        FROM auth.users
        WHERE id = v_actor;
    END IF;

    p_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'row_id', COALESCE(NEW.id, OLD.id),
        'op', TG_OP,
        'actor', v_actor,
        'before', to_jsonb(OLD),
        'after', to_jsonb(NEW)
    );

    INSERT INTO public.financial_audit (
        actor,
        actor_email,
        table_name,
        row_id,
        op,
        before_data,
        after_data,
        prev_hash,
        row_hash
    )
    VALUES (
        v_actor,
        v_email,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        p_prev,
        public._audit_hash(p_prev, p_payload)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
AFTER UPDATE OF available_balance, pending_balance, boost_credits ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();

DROP TRIGGER IF EXISTS trg_audit_credit ON public.credit_transactions;
CREATE TRIGGER trg_audit_credit
AFTER INSERT OR UPDATE OR DELETE ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();

CREATE TABLE IF NOT EXISTS public.anomaly_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    rule TEXT NOT NULL,
    detail JSONB
);

ALTER TABLE public.anomaly_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anomaly_events FROM anon, public;
GRANT SELECT ON public.anomaly_events TO authenticated;

CREATE OR REPLACE FUNCTION public.check_velocity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.credit_transactions
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_count > 10 THEN
        INSERT INTO public.anomaly_events (user_id, rule, detail)
        VALUES (
            NEW.user_id,
            'velocity_balance_change',
            jsonb_build_object(
                'count_1h', v_count,
                'transaction_id', NEW.id,
                'amount', NEW.amount,
                'type', NEW.type
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_velocity ON public.credit_transactions;
CREATE TRIGGER trg_velocity
AFTER INSERT ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_velocity();

-- ============================================================================
-- AŞAMA 6: B1 SAHA DÜZEYİNDE ŞİFRELEME (FIELD-LEVEL ENCRYPTION VAULT)
-- ============================================================================
-- DAHİLİ KRİPTOGRAFİK ANAHTAR & TUZ SAĞLAYICILAR
CREATE OR REPLACE FUNCTION public.internal_get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    configured_key TEXT;
BEGIN
    configured_key := current_setting('app.settings.encryption_key', true);
    IF configured_key IS NOT NULL AND length(configured_key) >= 32 THEN
        RETURN configured_key;
    END IF;
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

-- KRİPTOGRAFİK YARDIMCI FONKSİYONLAR
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
    RAISE EXCEPTION 'CRYPTOGRAPHIC_INTEGRITY_FAILURE: Veri çözülemedi veya kurcalanmış.'
        USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.encrypt_sensitive_data(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_sensitive_data(BYTEA) FROM PUBLIC, anon, authenticated;

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
            RETURN substring(clean_val from 1 for 4) || ' **** **** **** **** **** ' || substring(clean_val from len - 1 for 2);
        ELSE
            RETURN substring(clean_val from 1 for 2) || '****' || substring(clean_val from len - 1 for 2);
        END IF;
    ELSIF p_type = 'tckn' THEN
        IF len = 11 THEN
            RETURN substring(clean_val from 1 for 3) || '*****' || substring(clean_val from 9 for 2);
        ELSE
            RETURN substring(clean_val from 1 for 2) || '***' || substring(clean_val from len - 1 for 2);
        END IF;
    ELSE
        IF len <= 4 THEN
            RETURN '****';
        ELSE
            RETURN substring(clean_val from 1 for 2) || '****' || substring(clean_val from len - 1 for 2);
        END IF;
    END IF;
END;
$$;

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

CREATE INDEX IF NOT EXISTS idx_user_vault_user_id ON public.user_vault_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vault_blind_index ON public.user_vault_records(record_type, blind_index);

ALTER TABLE public.user_vault_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_vault_records FROM anon;

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

    v_bidx := public.generate_blind_index(p_plaintext);
    v_preview := public.mask_sensitive_preview(p_type, p_plaintext);
    v_enc := public.encrypt_sensitive_data(p_plaintext);

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

    IF v_row.user_id <> v_uid AND NOT v_is_admin THEN
        RAISE EXCEPTION 'FORBIDDEN: Bu kaydı görme yetkiniz yok.' USING ERRCODE = '42501';
    END IF;

    v_decrypted := public.decrypt_sensitive_data(v_row.encrypted_data);

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

GRANT EXECUTE ON FUNCTION public.mask_sensitive_preview(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_vault_record(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_vault_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vault_record(UUID) TO authenticated;

-- ============================================================================
-- AŞAMA 7: B7 OTURUM VE JWT SERTLEŞTİRMESİ (SESSION & TOKEN HARDENING)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'token_valid_after'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN token_valid_after TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_caller_uid UUID;
    v_target_uid UUID;
    v_is_admin BOOLEAN := false;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    v_target_uid := COALESCE(p_user_id, v_caller_uid);

    BEGIN
        v_is_admin := public.is_platform_admin();
    EXCEPTION WHEN OTHERS THEN
        v_is_admin := false;
    END;

    IF v_target_uid <> v_caller_uid AND NOT v_is_admin THEN
        RAISE EXCEPTION 'FORBIDDEN: Başka bir kullanıcının oturumlarını feshetme yetkiniz yok.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.profiles
    SET token_valid_after = now(),
        updated_at = now()
    WHERE id = v_target_uid;

    BEGIN
        INSERT INTO public.anomaly_events (
            user_id,
            rule,
            detail
        )
        VALUES (
            v_target_uid,
            'session_revocation_kill_switch',
            jsonb_build_object(
                'revoked_by', v_caller_uid,
                'is_admin', v_is_admin,
                'revocation_time', now(),
                'client_ip', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_uid,
        'revoked_at', now(),
        'message', 'Tüm aktif oturumlar başarıyla sonlandırıldı.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(UUID) TO authenticated;

-- ============================================================================
-- AŞAMA 8: B8 KVKK & PCI-DSS UYUM ÇERÇEVESİ (COMPLIANCE & ANONYMIZATION)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_my_account_and_anonymize()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_uid UUID;
    v_anon_name TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Oturum açmanız gerekmektedir.' USING ERRCODE = '42501';
    END IF;

    v_anon_name := 'Kullanıcı_' || substring(v_uid::text from 1 for 8);

    DELETE FROM public.user_vault_records
    WHERE user_id = v_uid;

    UPDATE public.profiles
    SET full_name = v_anon_name,
        bio = NULL,
        avatar_url = NULL,
        phone = NULL,
        city = NULL,
        district = NULL,
        token_valid_after = now(),
        updated_at = now()
    WHERE id = v_uid;

    DELETE FROM public.notifications
    WHERE user_id = v_uid;

    BEGIN
        INSERT INTO public.anomaly_events (
            user_id,
            rule,
            detail
        )
        VALUES (
            v_uid,
            'kvkk_account_anonymized',
            jsonb_build_object(
                'anonymized_at', now(),
                'client_ip', current_setting('request.headers', true)::jsonb->>'cf-connecting-ip'
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_uid,
        'message', 'Hesabınız ve kişisel verileriniz KVKK uyarınca başarıyla anonimleştirildi ve silindi.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account_and_anonymize() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account_and_anonymize() TO authenticated;


-- ============================================================================
-- AŞAMA 9: PARS-DEFENDER VERİTABANI DÜZEYİ AKTİF TEHDİT RADARI & OTONOM TECRİT
-- ============================================================================
-- Bu bölüm, Pars DevState gibi doğrudan API ve DB katmanına vuran sızma araçlarını
-- kapıda yakalar, 'security_threat_events'e yazar ve otomatik karantinaya alır.
-- ----------------------------------------------------------------------------

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

-- Yetkisiz Admin RPC Taramalarının Tuzağa Düşürülmesi
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
SET search_path = ''
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_admin_permission('community') THEN
    RAISE EXCEPTION 'FORBIDDEN: Destek yönetimi yetkisi gerekli.' USING ERRCODE = '42501';
  END IF;

  IF p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Görüşme kimliği gerekli.' USING ERRCODE = '22023';
  END IF;

  SELECT conversation.* INTO v_conversation
  FROM public.conversations AS conversation
  WHERE conversation.id = p_conversation_id
  FOR UPDATE;

  IF v_conversation.id IS NULL OR v_conversation.listing_id IS NOT NULL THEN
    RAISE EXCEPTION 'SUPPORT_CONVERSATION_NOT_FOUND: Destek görüşmesi bulunamadı.' USING ERRCODE = 'P0001';
  END IF;

  IF v_conversation.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'already_closed', TRUE, 'closed_at', v_conversation.closed_at);
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, type)
  VALUES (p_conversation_id, auth.uid(), 'Görüşme Kıstas Destek tarafından sonlandırıldı.', 'system');

  UPDATE public.conversations
  SET closed_at = clock_timestamp(),
      closed_by = auth.uid(),
      last_message = 'Görüşme sonlandırıldı.',
      last_message_at = clock_timestamp()
  WHERE id = p_conversation_id
  RETURNING * INTO v_conversation;

  INSERT INTO public.admin_action_audit (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'support_conversation_closed', 'conversation', p_conversation_id,
    jsonb_build_object('buyer_id', v_conversation.buyer_id, 'seller_id', v_conversation.seller_id));

  RETURN jsonb_build_object('success', TRUE, 'already_closed', FALSE, 'closed_at', v_conversation.closed_at);
END;
$$;

-- Bal Küpü (Canary Decoy) Tabloları
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

-- ============================================================================
-- AŞAMA 10: CANLI TEHDİT AKIŞI GÖRÜNTÜLEME ONARIMI (AUTH.USERS JOIN)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_get_threat_events(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_severity TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    threat_actor_id UUID,
    threat_actor_name TEXT,
    threat_actor_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    tool_fingerprint TEXT,
    attack_vector TEXT,
    severity TEXT,
    payload_snapshot TEXT,
    action_taken TEXT,
    is_quarantined BOOLEAN,
    detected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Bu operasyon yönetici yetkisi gerektirir.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.threat_actor_id,
        COALESCE(p.full_name, 'Anonim Saldırgan') as threat_actor_name,
        COALESCE(u.email::text, 'Belirtilmemiş') as threat_actor_email,
        e.ip_address,
        e.user_agent,
        e.tool_fingerprint,
        e.attack_vector,
        e.severity,
        e.payload_snapshot,
        e.action_taken,
        e.is_quarantined,
        e.detected_at
    FROM public.security_threat_events e
    LEFT JOIN public.profiles p ON p.id = e.threat_actor_id
    LEFT JOIN auth.users u ON u.id = e.threat_actor_id
    WHERE (p_severity IS NULL OR e.severity = p_severity)
    ORDER BY e.detected_at DESC
    LIMIT LEAST(p_limit, 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_threat_events(INT, INT, TEXT) TO authenticated;


