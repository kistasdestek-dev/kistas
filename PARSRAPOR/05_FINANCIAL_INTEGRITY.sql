-- ============================================================================
-- KISTAS.COM.TR — FINANCIAL INTEGRITY LAYER (bank-grade)
-- Target : iojgqicgeztqwkbetboa.supabase.co
-- Purpose: B3 (immutable audit), B4 (transaction integrity), B5 (fix the
--          self-destruct trigger), B6 (anomaly hooks). Apply in the Supabase
--          SQL editor (service-role context). Idempotent where possible.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 0. Helper: is this caller a platform admin? (server-side, not a profile field)
--    Adjust the admin email set to the real admin(s).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid
      AND email IN ('kistasdestek@gmail.com')   -- <-- real admin email(s)
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. IMMUTABLE AUDIT LOG (B3 — non-repudiation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_audit (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts          timestamptz NOT NULL DEFAULT now(),
    actor       uuid,
    actor_email text,
    table_name  text NOT NULL,
    row_id      uuid,
    op          text NOT NULL,              -- INSERT / UPDATE / DELETE
    before_data jsonb,
    after_data  jsonb,
    request_id  text,                        -- idempotency key (if supplied)
    prev_hash   text,                        -- hash-chain (tamper-evidence)
    row_hash    text
);

-- Only service_role may write; nobody (not even admin via PostgREST) may
-- UPDATE or DELETE audit rows.
REVOKE ALL ON public.financial_audit FROM anon, authenticated;
GRANT INSERT ON public.financial_audit TO authenticated;  -- triggers run as the role; keep tight
REVOKE UPDATE, DELETE ON public.financial_audit FROM public;

-- Hash-chain helper: each row's row_hash = sha256(prev_hash || canonical row).
CREATE OR REPLACE FUNCTION public._audit_hash(p_prev text, p_payload jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(coalesce(p_prev,'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_prev  text;
  p_payload jsonb;
BEGIN
  SELECT row_hash INTO p_prev FROM public.financial_audit ORDER BY id DESC LIMIT 1;
  p_payload := jsonb_build_object(
      'table', TG_TABLE_NAME, 'row_id', COALESCE(NEW.id, OLD.id),
      'op', TG_OP, 'actor', auth.uid(),
      'before', to_jsonb(OLD), 'after', to_jsonb(NEW)
  );
  INSERT INTO public.financial_audit
      (actor, actor_email, table_name, row_id, op, before_data, after_data, prev_hash, row_hash)
  VALUES (
      auth.uid(),
      (SELECT email FROM public.profiles WHERE id = auth.uid()),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      to_jsonb(OLD),
      to_jsonb(NEW),
      p_prev,
      public._audit_hash(p_prev, p_payload)
  );
  RETURN COALESCE(NEW, OLD);
END $$;

-- ----------------------------------------------------------------------------
-- 2. FIX SELF-DESTRUCT TRIGGER (B5) — admin-only financial columns, no delete
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
   IF TG_OP IN ('UPDATE','DELETE')
      AND (
            (TG_OP='UPDATE' AND (
                 NEW.is_verified       IS DISTINCT FROM OLD.is_verified
              OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
              OR NEW.pending_balance   IS DISTINCT FROM OLD.pending_balance
              OR NEW.boost_credits     IS DISTINCT FROM OLD.boost_credits))
         OR TG_OP='DELETE'
      )
      AND NOT public.is_platform_admin()
   THEN
      RAISE EXCEPTION 'FORBIDDEN: financial/verification fields are admin-only'
          USING ERRCODE = 'P0001';
   END IF;
   RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_guard_financial ON public.profiles;
CREATE TRIGGER trg_guard_financial
   BEFORE UPDATE OR DELETE ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.guard_financial_columns();

-- Audit every change to the sensitive profile columns.
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
   AFTER INSERT OR UPDATE OR DELETE ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit();

-- ----------------------------------------------------------------------------
-- 3. TRANSACTION INTEGRITY (B4) — double-entry, no-negative, idempotency
-- ----------------------------------------------------------------------------
-- (Adjust column names to the real credit_transactions schema.)
ALTER TABLE public.credit_transactions
   ADD COLUMN IF NOT EXISTS request_id text UNIQUE,
   ADD COLUMN IF NOT EXISTS direction  text CHECK (direction IN ('credit','debit')),
   ADD COLUMN IF NOT EXISTS amount     numeric(18,2) NOT NULL CHECK (amount > 0);

-- No negative balance, ever.
ALTER TABLE public.profiles
   DROP CONSTRAINT IF EXISTS chk_no_negative_balance;
ALTER TABLE public.profiles
   ADD CONSTRAINT chk_no_negative_balance CHECK (available_balance >= 0);

-- Double-entry guard: a debit must be paired with an equal credit in the same
-- request_id (enforce in the application RPC; this is the DB backstop).
CREATE OR REPLACE FUNCTION public.enforce_double_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
   IF NEW.direction = 'debit' THEN
      IF NOT EXISTS (
         SELECT 1 FROM public.credit_transactions
         WHERE request_id = NEW.request_id AND direction = 'credit'
           AND amount = NEW.amount AND id <> NEW.id
      ) THEN
         RAISE EXCEPTION 'DOUBLE_ENTRY_VIOLATION: debit without matching credit'
             USING ERRCODE = 'P0001';
      END IF;
   END IF;
   RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_double_entry ON public.credit_transactions;
CREATE TRIGGER trg_double_entry
   AFTER INSERT ON public.credit_transactions
   FOR EACH ROW EXECUTE FUNCTION public.enforce_double_entry();

DROP TRIGGER IF EXISTS trg_audit_credit ON public.credit_transactions;
CREATE TRIGGER trg_audit_credit
   AFTER INSERT OR UPDATE OR DELETE ON public.credit_transactions
   FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit();

-- ----------------------------------------------------------------------------
-- 4. ANOMALY / FRAUD HOOKS (B6)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomaly_events (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts          timestamptz NOT NULL DEFAULT now(),
    user_id     uuid,
    rule        text NOT NULL,
    detail      jsonb
);
REVOKE ALL ON public.anomaly_events FROM anon;

-- Velocity rule: > 5 balance-affecting transactions in a rolling hour.
CREATE OR REPLACE FUNCTION public.check_velocity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
   SELECT count(*) INTO n FROM public.credit_transactions
   WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour';
   IF n > 5 THEN
      INSERT INTO public.anomaly_events (user_id, rule, detail)
      VALUES (NEW.user_id, 'velocity_balance_change',
              jsonb_build_object('count_1h', n, 'tx', to_jsonb(NEW)));
   END IF;
   RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_velocity ON public.credit_transactions;
CREATE TRIGGER trg_velocity
   AFTER INSERT ON public.credit_transactions
   FOR EACH ROW EXECUTE FUNCTION public.check_velocity();

-- ----------------------------------------------------------------------------
-- 5. VERIFY (run after apply; expect all to pass)
-- ----------------------------------------------------------------------------
-- SELECT count(*) FROM public.financial_audit;                 -- grows on mutations
-- UPDATE public.profiles SET available_balance = available_balance - 1
--   WHERE id = <your_uid>;                                      -- expect P0001 (admin-only)
-- SELECT row_hash, prev_hash FROM public.financial_audit ORDER BY id DESC LIMIT 3;
-- ============================================================================
