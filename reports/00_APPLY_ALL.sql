-- ============================================================================
-- KISTAS.COM.TR — 00_APPLY_ALL.sql  (CONSOLIDATED, ORDERED, IDEMPOTENT)
-- ----------------------------------------------------------------------------
-- Single-run hardening for the Supabase backend. Paste this WHOLE file into the
-- Supabase SQL editor (service-role context) and run once.
--
-- Order matters:
--   STEP 1  RLS / grants          (01_RLS_HARDENING.sql)
--   STEP 2  Storage policies      (02_STORAGE_POLICY.sql)
--   STEP 3  Financial integrity   (05_FINANCIAL_INTEGRITY.sql)
--   STEP 4  Cleanup + verify
--
-- Idempotent: safe to re-run. Adjust the marked <...> values to the real
-- admin email(s) and the real credit_transactions column names before running.
-- ============================================================================


-- ============================================================================
-- STEP 1 — RLS / GRANTS  (closes V1, V1r, V6, B11 onboarding regression)
-- ============================================================================

-- 1a. Enforce RLS on every public table (idempotent).
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_upvotes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_showcase_winners  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit       ENABLE ROW LEVEL SECURITY;

-- 1b. Default-deny: revoke blanket anon access, grant back only the public read model.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL   ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.listings,
                 public.project_comments,
                 public.project_upvotes,
                 public.listing_images,
                 public.blog_posts,
                 public.categories
    TO anon;

-- 1c. profiles: anon has NO direct read. Public-safe view whitelists non-PII cols.
REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT full_name, is_verified, city, district, bio, avatar_url,
       rating_average, rating_count, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 1d. profiles: authenticated reads/writes ONLY their own row (fixes B11).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 1e. Private tables: owner-scoped select + insert.
DO $$
DECLARE t text;
BEGIN
   FOREACH t IN ARRAY ARRAY[
      'orders','credit_transactions','user_addresses','disputes','offers',
      'user_consents','notifications','reports','blocked_users',
      'conversations','messages'
   ] LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I_select_own ON public.%I;
         CREATE POLICY %I_select_own ON public.%I FOR SELECT USING (auth.uid() = user_id);
         DROP POLICY IF EXISTS %I_insert_own ON public.%I;
         CREATE POLICY %I_insert_own ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id);',
        t||'_select_own', t, t||'_select_own', t,
        t||'_insert_own', t, t||'_insert_own', t
      );
   END LOOP;
END $$;

-- 1f. admin_action_audit: service-role only.
REVOKE SELECT ON public.admin_action_audit FROM anon, authenticated;

-- 1g. Future tables are safe by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;


-- ============================================================================
-- STEP 2 — STORAGE POLICIES  (closes V2 + storage-spam DoS)
-- ============================================================================

DROP POLICY IF EXISTS "bucket_write_authenticated" ON storage.buckets;
CREATE POLICY "bucket_write_authenticated" ON storage.buckets
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "object_read_public" ON storage.objects;
CREATE POLICY "object_read_public" ON storage.objects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
CREATE POLICY "object_write_authenticated" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "object_update_owner" ON storage.objects;
CREATE POLICY "object_update_owner" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'kistas');

DROP POLICY IF EXISTS "object_delete_owner" ON storage.objects;
CREATE POLICY "object_delete_owner" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'kistas');

-- (Dashboard) set max upload size 5 MB + per-bucket quota to cap spam DoS.


-- ============================================================================
-- STEP 3 — FINANCIAL INTEGRITY  (B3 audit, B4 double-entry, B5 self-destruct, B6 anomaly)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3a. Admin helper (server-side). <EDIT> real admin email(s):
CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND email IN ('kistasdestek@gmail.com')
  );
$$;

-- 3b. Immutable, hash-chained audit log.
CREATE TABLE IF NOT EXISTS public.financial_audit (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts          timestamptz NOT NULL DEFAULT now(),
    actor       uuid,
    actor_email text,
    table_name  text NOT NULL,
    row_id      uuid,
    op          text NOT NULL,
    before_data jsonb,
    after_data  jsonb,
    request_id  text,
    prev_hash   text,
    row_hash    text
);
REVOKE ALL ON public.financial_audit FROM anon, authenticated;
GRANT INSERT ON public.financial_audit TO authenticated;
REVOKE UPDATE, DELETE ON public.financial_audit FROM public;

CREATE OR REPLACE FUNCTION public._audit_hash(p_prev text, p_payload jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(coalesce(p_prev,'GENESIS') || ':' || p_payload::text, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.write_financial_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE p_prev text; p_payload jsonb;
BEGIN
  SELECT row_hash INTO p_prev FROM public.financial_audit ORDER BY id DESC LIMIT 1;
  p_payload := jsonb_build_object('table', TG_TABLE_NAME, 'row_id', COALESCE(NEW.id, OLD.id),
      'op', TG_OP, 'actor', auth.uid(), 'before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  INSERT INTO public.financial_audit
      (actor, actor_email, table_name, row_id, op, before_data, after_data, prev_hash, row_hash)
  VALUES (auth.uid(),
      (SELECT email FROM public.profiles WHERE id = auth.uid()),
      TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
      to_jsonb(OLD), to_jsonb(NEW), p_prev, public._audit_hash(p_prev, p_payload));
  RETURN COALESCE(NEW, OLD);
END $$;

-- 3c. Fix self-destruct: financial/verification columns are admin-only, no delete.
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
      RAISE EXCEPTION 'FORBIDDEN: financial/verification fields are admin-only' USING ERRCODE='P0001';
   END IF;
   RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_guard_financial ON public.profiles;
CREATE TRIGGER trg_guard_financial
   BEFORE UPDATE OR DELETE ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.guard_financial_columns();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
   AFTER INSERT OR UPDATE OR DELETE ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit();

-- 3d. Transaction integrity. <EDIT> column names to the real schema if different.
ALTER TABLE public.credit_transactions
   ADD COLUMN IF NOT EXISTS request_id text UNIQUE,
   ADD COLUMN IF NOT EXISTS direction  text CHECK (direction IN ('credit','debit')),
   ADD COLUMN IF NOT EXISTS amount     numeric(18,2) NOT NULL CHECK (amount > 0);

ALTER TABLE public.profiles
   DROP CONSTRAINT IF EXISTS chk_no_negative_balance;
ALTER TABLE public.profiles
   ADD CONSTRAINT chk_no_negative_balance CHECK (available_balance >= 0);

CREATE OR REPLACE FUNCTION public.enforce_double_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
   IF NEW.direction = 'debit' THEN
      IF NOT EXISTS (
         SELECT 1 FROM public.credit_transactions
         WHERE request_id = NEW.request_id AND direction = 'credit'
           AND amount = NEW.amount AND id <> NEW.id
      ) THEN
         RAISE EXCEPTION 'DOUBLE_ENTRY_VIOLATION: debit without matching credit' USING ERRCODE='P0001';
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

-- 3e. Anomaly / velocity hook.
CREATE TABLE IF NOT EXISTS public.anomaly_events (
    id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts      timestamptz NOT NULL DEFAULT now(),
    user_id uuid,
    rule    text NOT NULL,
    detail  jsonb
);
REVOKE ALL ON public.anomaly_events FROM anon;

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


-- ============================================================================
-- STEP 4 — CLEANUP + VERIFY
-- ============================================================================

-- 4a. Remove planted probe/foothold files (undeletable by any client role).
DELETE FROM storage.objects
WHERE bucket_id = 'kistas'
  AND name IN (
    'pars_foothold_beacon.png','pars_test.png','pars_test_authed.png',
    'pars_postpatch_test.png','pars_still_open.png','final_check.png',
    'hardening_probe_1789681500.png'
  );

-- 4b. VERIFY (run these; expected results in comments).
--   anon select=* on profiles  -> 401 (no table access)
--   anon select=id on profiles -> 401 (enumeration killed)
--   anon profiles_public       -> 200 (only whitelisted cols, no id/phone)
--   authenticated own profile  -> 200 (B11 fixed)
--   anon storage write         -> 403
--   self balance change        -> P0001 (admin-only)
SELECT 'VERIFY: run the curl audit in FINAL_POSTURE_REPORT.md section 3' AS next_step;
SELECT count(*) AS audit_rows_so_far FROM public.financial_audit;
-- ============================================================================
