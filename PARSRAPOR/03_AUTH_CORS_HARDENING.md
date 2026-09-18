# KISTAS.COM.TR — AUTH + CORS HARDENING (hardened replacement)

Target: `iojgqicgeztqwkbetboa.supabase.co` (Supabase Auth) + `www.kistas.com.tr`
Purpose: Close V3 (user enumeration), V4 (no auth rate limiting), V5 (CORS `*` on
Supabase), and the NEW finding V9 (owner's "Kıstas name protection" trigger now
returns HTTP 500 on EVERY signup → onboarding fully broken).

These are Supabase Dashboard / config changes (not SQL). Apply in the Supabase
project settings.

---

## 1. AUTH RATE LIMITING (closes V4 — CWE-307)

**Current (PROVEN 2026-09-17 21:44 UTC):** 12 rapid failed logins → all `400`,
no `429`, no lockout, no CAPTCHA. Brute-forceable.

**Hardened config (Supabase Dashboard → Authentication → Rate Limit):**
| Setting | Value |
|---|---|
| Enable rate limiting | **ON** |
| Max attempts / window | **5 per 60s per IP** (login + signup + recovery) |
| On exceed | return `429 Too Many Requests` |

**Supabase env (project settings → Auth):**
```
GOTRUE_RATE_LIMIT_TOKEN=5
GOTRUE_RATE_LIMIT_DURATION=60
GOTRUE_RATE_LIMIT_SENTINEL_TOKEN=5
GOTRUE_RATE_LIMIT_SENTINEL_DURATION=3600
```
**Defense-in-depth (recommended):** put a Cloudflare WAF rate-limit rule on
`/auth/v1/token` and `/auth/v1/signup` (e.g. >10 req/min/IP → challenge/block).
This is the layer that actually stops distributed brute-force, since Supabase
rate-limits are per-IP and bypassable with a proxy pool.

---

## 2. USER ENUMERATION (closes V3 — CWE-204)

**Current (PROVEN):** signup with an existing email returns `role:""` (200); a
new email returns `role:"authenticated"` (200) → existence oracle.

**Hardened config:**
1. **Enable email confirmation** (already `mailer_autoconfirm: false` → set to
   **true**). With confirmation on, signup always returns the same generic
   "check your inbox" 200 for both existing and new emails → oracle removed.
2. **Return identical response shape** for existing vs new. Supabase does this
   automatically once `mailer_autoconfirm=true` (no user object leaked for
   existing emails).
3. **Disable the raw `role` field difference** — with confirmation on, an
   existing-email signup returns `200` with no `role`/`id` payload, matching a
   new signup.

**Note:** The owner's new "Kıstas name protection" trigger (V9) currently
returns `500` on ALL signups, which *accidentally* kills the enumeration oracle
but also kills legitimate onboarding. The correct fix is email confirmation,
not a blanket 500.

---

## 3. CORS (closes V5 — CWE-942)

**Current (PROVEN):** `rest/v1` and `storage/v1` reflect
`access-control-allow-origin: *` for any origin.

**Hardened config (Supabase Dashboard → API → Settings → CORS):**
```
Allowed origins:
  https://www.kistas.com.tr
  https://kistas.com.tr
  http://localhost:3000        (dev only; remove for prod)
```
Do NOT use `*`. This stops any third-party site from reading Supabase data or
uploading to the bucket cross-origin from a victim's browser.

**Main site (`www.kistas.com.tr`):** CORS is already correctly scoped to
`https://www.kistas.com.tr` (verified 2026-09-17 21:44 UTC — the earlier V8
`*` finding is now FIXED by the owner). No action needed.

---

## 4. NEW FINDING V9 — Broken onboarding (owner's over-patch)

**Observed (PROVEN 2026-09-17 21:44 UTC):** Every `POST /auth/v1/signup` —
existing email, new email, random email, or with a `full_name` — returns:
```
HTTP 500
{"code":"P0001","message":"FORBIDDEN: 'Kıstas' adı ve görsel benzeri
 varyasyonları yalnızca platform yöneticileri tarafından kullanılabilir."}
```
The owner added a name-protection trigger (to stop impersonation of the
"Kıstas" brand) but it is firing on **all** signups, not just brand-impersonating
ones. Result: **no new user can register.** This is a functional regression
introduced during the emergency hardening.

**Hardened fix:** scope the trigger to actually-protected values only:
```sql
-- Only block when the display name (not the email) matches the brand.
CREATE OR REPLACE FUNCTION public.protect_brand_name()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
   IF new.full_name IS NOT NULL
      AND (
         lower(new.full_name) ILIKE 'kistas%'
         OR lower(new.full_name) ILIKE '%kistas%'
      )
      AND auth.role() <> 'service_role'
      AND NOT public.is_platform_admin(auth.uid())
   THEN
      RAISE EXCEPTION 'FORBIDDEN: brand name reserved for platform admins'
          USING ERRCODE = 'P0001';
   END IF;
   RETURN new;
END $$;
```
Key changes: (a) check `full_name`, not the email local-part; (b) allow
`service_role`; (c) allow verified platform admins; (d) return a clean `403`
(`P0001` is fine) instead of a `500`. This preserves brand protection while
restoring onboarding.

---

## 5. RESIDUAL / DEFENSE-IN-DEPTH CHECKLIST

- [ ] Rotate the Supabase **publishable key** is NOT required (it is public by
      design), but confirm the **service-role key** is not in any JS bundle
      (verified negative 2026-09-17).
- [ ] Enable **Supabase Auth MFA** (TOTP) for the admin account
      `kistasdestek@gmail.com` — the only remaining path to full control is the
      admin password (no rate limit currently).
- [ ] Add a **Cloudflare WAF managed rule** for SQLi / path traversal on the
      Supabase REST endpoints (defense-in-depth; PostgREST is parameterized but
      cheap to add).
- [ ] Set a **storage bucket quota** + max file size (see 02_STORAGE_POLICY.sql).
- [ ] Add **audit logging** on `admin_action_audit` (already RLS-locked — good).
- [ ] Schedule a **quarterly re-audit** (see final report).
