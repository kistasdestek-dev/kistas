-- ============================================================================
-- FAZ 17 / AŞAMA 4: BANKA DÜZEYİ FİNANSAL BÜTÜNLÜK, DENETİM & ANOMALİ RADARI (B3, B4, B5, B6)
-- ============================================================================
-- PARS DevState Bulguları:
-- B5: Profil satırını silen self-destruct bug'ı (kullanıcı bakiye/onay değiştirmeye çalıştığında siliniyordu).
-- B3: Kriptografik (SHA-256) hash-zincirli değiştirilemez denetim izi eksikliği.
-- B4: Kredi cüzdanı tutarlılığı, negatif bakiye engeli ve idempotency (request_id).
-- B6: Şüpheli para/kredi hareketlerinde hız (velocity) limiti ve anomali tespiti.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. B5: PROFIL SELF-DESTRUCT BUG'ININ GİDERİLMESİ (GUARD FINANCIAL COLUMNS)
-- Kullanıcı kendi bakiyesini veya onay rozetini değiştirmeye çalıştığında satır SİLİNMEZ,
-- açık bir FORBIDDEN (P0001) hatası fırlatılır.
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- service_role her zaman muaftır
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


-- 2. B4: NEGATİF BAKİYE VE İŞLEM TUTARLILIĞI KISITLARI
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


-- 3. B3: KRİPTOGRAFİK (SHA-256) HASH-ZİNCİRLİ DEĞİŞTİRİLEMEZ DENETİM İZİ (financial_audit)
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

-- Zero-Trust: PostgREST üzerinden UPDATE ve DELETE kesinlikle yasaktır (Append-Only)
ALTER TABLE public.financial_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_audit FROM anon, public;
GRANT INSERT, SELECT ON public.financial_audit TO authenticated, service_role;
REVOKE UPDATE, DELETE ON public.financial_audit FROM authenticated, anon, public;

-- Hash zinciri hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION public._audit_hash(p_prev TEXT, p_payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(digest(COALESCE(p_prev, 'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

-- Otomatik denetim yazma tetikleyici motoru
CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    p_prev TEXT;
    p_payload JSONB;
    v_actor UUID;
    v_email TEXT;
BEGIN
    v_actor := auth.uid();
    
    -- Son hash'i al
    SELECT row_hash INTO p_prev
    FROM public.financial_audit
    ORDER BY id DESC
    LIMIT 1;

    -- Kullanıcı e-postasını al
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
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();

DROP TRIGGER IF EXISTS trg_audit_credit ON public.credit_transactions;
CREATE TRIGGER trg_audit_credit
AFTER INSERT OR UPDATE OR DELETE ON public.credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.write_financial_audit();


-- 4. B6: ANOMALİ VE HIZ (VELOCITY) TESPİT MOTORU
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
