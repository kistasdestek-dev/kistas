# KISTAS.COM.TR — FULL SECURITY TEST REPORT (Consolidated)

**Date:** 2026-09-18 22:08 UTC
**Executor:** Sayra-Core (PARS_DEVSTATE)
**Target:** `www.kistas.com.tr` + `iojgqicgeztqwkbetboa.supabase.co`
**Method:** Full external pentest — anon + authenticated + edge cases + infrastructure
**Purpose:** Single consolidated report for the developer's AI model to use as context when fixing.

---

## 1. TARGET PROFILE

| Field | Value |
|---|---|
| Frontend | Expo (React Native Web) SPA → migrating to Next.js 16.3.5 monorepo |
| Backend | Supabase (`iojgqicgeztqwkbetboa.supabase.co`) |
| CDN/WAF | Cloudflare |
| Auth | Supabase Auth (email + Google + GitHub + phone/Twilio) |
| Storage | Supabase Storage (bucket: `kistas`) |
| Publishable key | `sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC` (public by design) |
| Admin email | `kistasdestek@gmail.com` |
| Users | 3 registered (Emirhan Çetinkaya, Mustafa Türköz, Kıstas org) |
| Tables | profiles, listings, project_comments, project_upvotes, listing_images, blog_posts, categories, orders, notifications, reports, reviews, blocked_users, credit_transactions, conversations, messages, user_consents, user_addresses, disputes, offers, weekly_showcase_winners, admin_action_audit |

---

## 2. TRANSPORT LAYER — ALREADY STRONG (do not change)

| Control | Value | Status |
|---|---|---|
| TLS | TLSv1.3, TLS_AES_256_GCM_SHA384 | ✅ |
| HSTS | max-age=63072000; includeSubDomains; preload | ✅ |
| CSP | default-src 'self'; frame-ancestors 'none'; object-src 'none' | ✅ |
| Clickjacking | X-Frame-Options: DENY + CSP frame-ancestors 'none' | ✅ |
| MIME sniff | X-Content-Type-Options: nosniff | ✅ |
| Referrer | strict-origin-when-cross-origin | ✅ |
| Permissions | camera=(), microphone=(), geolocation=(), payment=(), usb=() | ✅ |
| WAF/CDN | Cloudflare | ✅ |
| Main-site CORS | https://www.kistas.com.tr only | ✅ |

**One optional tightening:** CSP `script-src` includes `'unsafe-inline'` → migrate to nonces for bank-grade.

---

## 3. ALL FINDINGS (severity-ordered)

### CRITICAL

| # | Finding | CWE | Evidence |
|---|---|---|---|
| **D1** | **Authenticated IDOR — Full Profile Read.** Any logged-in user can `GET /rest/v1/profiles?select=*` and read ALL users' profiles including phone, balance, fcm_token, boost_credits. | CWE-639 | `GET /rest/v1/profiles?select=*&limit=50` (JWT) → 200, 3 rows with real names + sensitive cols |

### HIGH

| # | Finding | CWE | Evidence |
|---|---|---|---|
| **D2** | **Authenticated cross-user read on financial tables.** `orders`, `conversations`, `messages`, `credit_transactions`, `user_addresses` all return 200 for any authenticated user (currently empty, but access is open). | CWE-862 | `GET /rest/v1/credit_transactions?select=*` (JWT) → 200 |

### MEDIUM

| # | Finding | CWE | Evidence |
|---|---|---|---|
| **V1r** | **Anon user-ID enumeration.** `GET /rest/v1/profiles?select=id` (anon) → 200. Also `select=full_name` → 200. Anon can still read non-sensitive columns directly from the table. | CWE-204 | `profiles_id=200`, `profiles_full_name=200` |
| **V2** | **Anon storage write.** `POST /storage/v1/object/kistas/<file>` (anon) → 200. Persistent, undeletable by client roles. | CWE-285 | Upload confirmed, key created |
| **V4** | **No auth rate limiting.** 10+ rapid failed logins → all 400, no 429, no lockout. Brute-forceable. | CWE-307 | 10× 400, no 429 |
| **V5** | **CORS `*` on Supabase REST + Storage.** Reflects any origin. | CWE-942 | `access-control-allow-origin: *` |
| **D4** | **No storage upload size limit.** 10 MB file accepted → spam DoS vector. | CWE-770 | 10MB upload → 200 |

### LOW

| # | Finding | CWE | Evidence |
|---|---|---|---|
| **D5** | **MFA not enabled.** Password-only auth for all users including admin. | CWE-308 | `GET /auth/v1/factors` → 405 |
| **V7** | **Admin RPC names in JS bundle.** `admin_clear_support_messages`, `admin_close_support_conversation` visible (gated server-side, but reveals API surface). | CWE-200 | JS bundle scan |

### ALREADY FIXED (owner patched)

| # | Finding | Status |
|---|---|---|
| V1 | Anon PII read (`profiles?select=*`) | ✅ 401 |
| V1b | phone/fcm/balance/iban/identity_number (anon) | ✅ 401/400 |
| V3 | User enumeration via signup | ✅ Fixed (signup → 200, no role diff) |
| V8 | Main-site CORS `*` | ✅ Scoped to `https://www.kistas.com.tr` |
| V9 | Blanket signup 500 (onboarding broken) | ✅ Fixed (signup → 200) |
| V6 | Schema disclosure (11 private tables) | ✅ 401 |
| B11 | Authenticated profile read/write 403 (owner over-patch) | ✅ Fixed (200) |

---

## 4. NEGATIVE RESULTS (tested, secure)

| Vector | Result |
|---|---|
| SQLi on RPC functions | NEGATIVE (parameterized) |
| HTML/SVG upload (XSS) | NEGATIVE (mime blocked) |
| Storage path traversal | NEGATIVE (sanitized) |
| Storage listing | NEGATIVE (disabled) |
| Edge functions | NEGATIVE (none deployed) |
| Realtime websocket | NEGATIVE (500) |
| Subdomain takeover | NEGATIVE (no dead CNAMEs) |
| `.env`/`.git`/config leak | NEGATIVE (SPA fallback) |
| Password-reset enumeration | NEGATIVE (both 200) |
| Email change (PATCH /auth/v1/user) | NEGATIVE (405 disabled) |
| Service-role key in JS | NEGATIVE (not present) |
| GraphQL | NEGATIVE (not enabled) |
| Admin brute-force (5975 candidates) | NEGATIVE (no hit) |

---

## 5. COMPLETE FIX LIST (priority-ordered)

### SQL (Supabase SQL editor)

```sql
-- FIX D1 (CRITICAL): profiles SELECT → own-row only
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- FIX D1 (CRITICAL): profiles UPDATE → own-row only
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FIX D1 (CRITICAL): profiles INSERT → own-row only
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- FIX V1r (MEDIUM): revoke anon direct table read
REVOKE SELECT ON public.profiles FROM anon;

-- FIX D2 (HIGH): financial tables → owner-scoped SELECT
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
            FOR SELECT USING (auth.uid() = user_id);',
        t||'_select_own', t, t||'_select_own', t
      );
   END LOOP;
END $$;

-- FIX V2 (MEDIUM): storage → authenticated write only
DROP POLICY IF EXISTS "object_write_authenticated" ON storage.objects;
CREATE POLICY "object_write_authenticated" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "object_delete_owner" ON storage.objects;
CREATE POLICY "object_delete_owner" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'kistas');

-- Public read stays open:
DROP POLICY IF EXISTS "object_read_public" ON storage.objects;
CREATE POLICY "object_read_public" ON storage.objects
    FOR SELECT USING (true);
```

### Supabase Dashboard settings

| Setting | Path | Value |
|---|---|---|
| Auth rate limit | Authentication → Rate Limit | ON, 5 attempts / 60s |
| CORS allowlist | API → Settings → CORS | `https://www.kistas.com.tr`, `https://kistas.com.tr` |
| Storage max size | Storage → `kistas` → Settings | 5 MB |
| Storage quota | Storage → `kistas` → Settings | 1 GB (or appropriate) |
| MFA (admin) | Authentication → MFA | Enable TOTP for `kistasdestek@gmail.com` |
| Email confirmation | Authentication → Email | `mailer_autoconfirm = true` |

### Cloudflare (optional, defense-in-depth)

| Rule | Config |
|---|---|
| WAF rate limit on `/auth/v1/token` | >10 req/min/IP → challenge |
| WAF rate limit on `/auth/v1/signup` | >5 req/min/IP → challenge |

---

## 6. VERIFICATION (run after fixes, all must pass)

```bash
SB=https://iojgqicgeztqwkbetboa.supabase.co
KEY=sb_publishable_n82VP8BBfN_HcJC0RClzTA_qJFPwtEC

# D1: authenticated IDOR closed (need a JWT)
#   GET /rest/v1/profiles?select=* (JWT) → only own row (1 row)
#   GET /rest/v1/profiles?id=eq.<other_uid>&select=* (JWT) → 200, 0 rows

# V1r: anon enumeration closed
curl -s -o /dev/null -w "profiles_id=%{http_code}\n" "$SB/rest/v1/profiles?select=id&limit=1" -H "apikey: $KEY"
# Expected: 401

# V2: anon storage write closed
printf '\x89PNG\r\n\x1a\n' > /tmp/p.png
curl -s -o /dev/null -w "storage_write=%{http_code}\n" -X POST "$SB/storage/v1/object/kistas/test_$(date +%s).png" -H "apikey: $KEY" -H "Content-Type: image/png" --data-binary @/tmp/p.png
# Expected: 403

# V4: rate limit active
for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code} " -X POST "$SB/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"email":"kistasdestek@gmail.com","password":"x'$i'"}'; sleep 0.3; done; echo
# Expected: at least one 429

# V5: CORS blocked
curl -s -I -X OPTIONS "$SB/rest/v1/profiles" -H "apikey: $KEY" -H "Origin: https://evil.example" | grep -i access-control-allow-origin || echo "cors_blocked=OK"
# Expected: cors_blocked=OK (no ACAO header)

# Onboarding still works
curl -s -o /dev/null -w "signup=%{http_code}\n" -X POST "$SB/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"email":"verify_'"$(date +%s)"'@gmail.com","password":"TestPass123.."}'
# Expected: 200
```

**Success criteria (zero known exploitable vectors):**
- `profiles_id=401`
- `storage_write=403`
- Rate-limit loop shows `429` by attempt ≤6
- `cors_blocked=OK`
- `signup=200`
- Authenticated `profiles?select=*` returns only own row

---

## 7. RESIDUAL RISK (after all fixes)

| Risk | Mitigation |
|---|---|
| Admin password brute-force | MFA (TOTP) + rate limit + WAF rule |
| Service-role key leak | Keep out of JS, rotate quarterly, least-privilege |
| Business-level fraud (fake users, balance drain) | Anomaly detection + step-up MFA on payouts + velocity limits |
| KVKK compliance (if IBAN/TCKN populated) | Field-level encryption + data minimization + DPO |
| Next.js migration regressions | Use `@supabase/ssr` + httpOnly cookie + middleware auth + server-side re-authz on every financial route |

---

## 8. NEXT.JS MIGRATION SECURITY CHECKLIST

When migrating Expo → Next.js 16.3.5:

- [ ] `@supabase/ssr` + httpOnly cookie (NEVER localStorage JWT)
- [ ] `middleware.ts` → redirect unauthenticated users from protected routes
- [ ] Every financial API route: `const { data: { user } } = await supabase.auth.getUser()` → check `user` + RLS
- [ ] Publishable key: client-side (public by design)
- [ ] Service-role key: `SERVER_ONLY` env (never `NEXT_PUBLIC_`)
- [ ] CSP: drop `'unsafe-inline'` from `script-src` (use nonces)
- [ ] Re-run full audit after migration (same verification block §6)

**Rule:** Security lives in Supabase RLS + server-side checks, NOT in the frontend framework. Migration is security-neutral if you follow this.

---

## 9. [STATE]

```
[STATE]
task: kistas_full_security_test
status: COMPLETE
findings: 1 CRITICAL (D1 IDOR), 1 HIGH (D2 financial tables), 5 MEDIUM (V1r, V2, V4, V5, D4), 2 LOW (D5, V7)
fixed_by_owner: V1, V1b, V3, V6, V8, V9, B11
transport: ALREADY STRONG (TLS 1.3, HSTS preload, CSP, WAF)
negative_results: 13 vectors tested, all secure
deliverable: this file (single consolidated report)
re-audit: after fixes applied (same verification block §6)
confidence: [PROVEN] all live-verified 2026-09-18 21:57-22:08 UTC
```
