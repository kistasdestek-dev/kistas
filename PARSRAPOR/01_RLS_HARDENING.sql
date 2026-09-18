-- ============================================================================
-- KISTAS.COM.TR — RLS / GRANT HARDENING (hardened replacement)
-- Target : iojgqicgeztqwkbetboa.supabase.co
-- Purpose: Close V1 (anon PII read), V6 (schema disclosure), and the residual
--          `profiles.id` anon-enumeration left open by the owner's column-level
--          patch. Apply in Supabase SQL editor (service-role context).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Prerequisite: enforce RLS on every public table (idempotent)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_upvotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_showcase_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. REVOKE blanket anon SELECT (root cause of V1 + V6)
--    Supabase default grants SELECT to anon/authenticated on all tables.
--    Revoke, then grant back ONLY what the public read model needs.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL   ON ALL TABLES IN SCHEMA public FROM anon;

-- Public read model (safe, non-PII columns only).
-- NOTE: `id` is intentionally NOT exposed to anon to kill user-ID enumeration.
GRANT SELECT ON public.listings,
                 public.project_comments,
                 public.project_upvotes,
                 public.listing_images,
                 public.blog_posts,
                 public.categories
    TO anon;

-- ----------------------------------------------------------------------------
-- 2. profiles — the sensitive table
--    Anon: NO direct table read. Public profile data must be served through a
--    SECURITY DEFINER view that whitelists non-PII columns.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles FROM authenticated;

-- Public-safe view (no phone, no balance, no id, no location, no fcm).
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

-- Authenticated users read their OWN full row (and only their own).
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Authenticated users may update their OWN row.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Row creation is owned by the auth trigger (service role), not by clients.
-- If a client INSERT path is required, gate it to the caller's own uid:
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. Fix the owner's functional regression (onboarding broken by patch)
--    The emergency patch removed `GRANT UPDATE ... TO authenticated`, which
--    broke the app's own `profiles.upsert(...)` on signup. The policies above
--    restore a SAFE self-service path (own-row only) without reopening anon PII.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 4. Private tables — authenticated, owner-scoped (no cross-user read)
-- ----------------------------------------------------------------------------
-- orders / credit_transactions / user_addresses / disputes / offers /
-- user_consents / notifications / reports / blocked_users / conversations /
-- messages : owner-scoped select + insert; admin read via service role.
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
         CREATE POLICY %I_select_own ON public.%I
            FOR SELECT USING (auth.uid() = user_id);
         DROP POLICY IF EXISTS %I_insert_own ON public.%I;
         CREATE POLICY %I_insert_own ON public.%I
            FOR INSERT WITH CHECK (auth.uid() = user_id);',
        t||'_select_own', t, t||'_select_own', t,
        t||'_insert_own', t, t||'_insert_own', t
      );
   END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. admin_action_audit — service-role only (no anon/authenticated access)
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.admin_action_audit FROM anon, authenticated;
-- (service_role bypasses RLS by default; keep it that way.)

-- ----------------------------------------------------------------------------
-- 6. Default-deny going forward (new tables must be explicitly granted)
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   REVOKE ALL ON TABLES FROM authenticated;
