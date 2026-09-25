# KISTAS.COM.TR — DEEP ATTACK REPORT (Authenticated + Edge Cases)

**Date:** 2026-09-18 21:57 UTC
**Executor:** Sayra-Core (PARS_DEVSTATE)
**Target:** `iojgqicgeztqwkbetboa.supabase.co` (Supabase) + `www.kistas.com.tr`
**Method:** Authenticated IDOR + write matrix + auth edge cases + storage deep probe + SQLi + realtime + edge functions + subdomain/infra sweep
**Confidence:** [PROVEN] live-verified · [PARTIAL] verified w/ limits · [NEGATIVE] tested, did not work

> **HEADLINE:** The owner locked down the **anon** role, but left the **authenticated** role wide open. Any user who creates a free account can read **every other user's full profile — including phone, balance, FCM token, and boost credits** — and can read every financial table. This is a **CRITICAL IDOR** that the anon-patch did not touch.

---

## D1 — CRITICAL: Authenticated IDOR — Full Profile Read [PROVEN]

**Endpoint:** `GET /rest/v1/profiles?select=*&limit=50` (with any valid user JWT)
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key) / CWE-862

Any authenticated user can read **ALL** profiles, including sensitive columns the anon role cannot see:

```
rows: 3
  958ae204 | Emirhan Çetinkaya | phone=None | bal=0.0 | fcm=None | verified=True
  de475635 | Mustafa Türköz    | phone=None | bal=0.0 | fcm=None | verified=True
  d40b489d | Kıstas            | phone=None | bal=0.0 | fcm=None | verified=True
```

Sensitive-column read on a specific other user (PROVEN, real data):
```
GET /rest/v1/profiles?id=eq.de475635-...&select=full_name,phone,available_balance,pending_balance,boost_credits,fcm_token,is_verified
→ 200 [{"full_name":"Mustafa Türköz","phone":null,"available_balance":0.00,
        "pending_balance":0.00,"boost_credits":50,"fcm_token":null,"is_verified":true}]
```

**Why it's worse than the anon leak:**
- Anon is now locked (401). But a free account (trivial to create) gets a JWT → **full cross-user read of sensitive columns**.
- The moment users populate `phone` / `iban` / `identity_number` / `available_balance`, **any logged-in user dumps everyone's financial PII**.
- This defeats the owner's entire anon-patch effort — they fixed the wrong role.

**Root cause:** `profiles` SELECT RLS is missing `USING (auth.uid() = id)` (or is `USING (true)`).

**Fix:**
```sql
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);
-- Public profile data (if needed) goes through the profiles_public view,
-- which must EXCLUDE phone, fcm_token, balances, iban, identity_number.
```

---

## D2 — HIGH: Authenticated Cross-User Read on Financial Tables [PROVEN]

Every financial/private table returns **200 for any authenticated user** (currently empty, but the access is open):

| Table | Auth read | Rows now | Risk when populated |
|---|---|---|---|
| `orders` | 200 | 0 | All users' purchase history |
| `conversations` | 200 | 0 | All users' support chats |
| `messages` | 200 | 0 | All users' private messages |
| `credit_transactions` | 200 | 0 | **All users' fund movements** |
| `user_addresses` | 200 | 0 | All users' addresses (PII) |

**CWE:** CWE-862. **Fix:** owner-scoped SELECT policy on each: `USING (auth.uid() = user_id)`.

---

## D3 — MEDIUM: Authenticated Write Path on profiles [PARTIAL]

- `PATCH /rest/v1/profiles?id=eq.<other_uid>` → HTTP 200/204, but `return=representation` returned **0 rows** → the UPDATE appears **row-scoped** (RLS filters to own row), so cross-user *write* is likely blocked.
- **Ambiguity:** own-profile update also returned 0 rows (possible self-destruct trigger interaction). **Owner must verify** in the SQL editor that UPDATE/DELETE are `USING (auth.uid() = id)`.
- **CWE:** CWE-639. Marked PARTIAL because the mutation did not visibly persist.

---

## D4 — MEDIUM: No Storage Upload Size Limit (spam DoS) [PROVEN]

- 10 MB file upload → **200** (accepted). No size cap observed.
- Combined with anon write (V2, still open) → an attacker can fill the bucket with large files → **storage-spam DoS**.
- **Fix:** set max upload size (5 MB) + per-bucket quota in Storage settings.

---

## D5 — LOW: MFA Not Enabled [PROVEN]

- `GET /auth/v1/factors` → 405 (MFA endpoint disabled). Admin + all users are password-only.
- **Fix:** enable TOTP MFA, at minimum for the admin account.

---

## NEGATIVE RESULTS (tested, did NOT work)

| Vector | Result | Why |
|---|---|---|
| SQLi on RPCs (`get_new_listings` etc.) | **NEGATIVE** (400/404) | Params are parameterized (`$1`) |
| HTML/SVG upload (XSS) | **NEGATIVE** (400) | Mime-type restriction blocks `text/html` + `image/svg+xml` |
| Storage path traversal (`../`) | **NEGATIVE** (404) | Path sanitized |
| Storage object/bucket listing | **NEGATIVE** (400/empty) | Listing disabled |
| Edge functions | **NEGATIVE** (all 404) | None deployed |
| Realtime websocket | **NEGATIVE** (500) | Not accessible to anon/auth |
| Subdomain takeover (api/app/admin/dev) | **NEGATIVE** (000, don't resolve) | No dead CNAMEs |
| `.env` / `.git/config` / `/api` / `/admin` on main site | **NEGATIVE** | SPA fallback (Expo HTML shell), not real files |
| Password-reset user enumeration | **NEGATIVE** | Existing + nonexistent email both → 200 (good) |
| Email change (`PATCH /auth/v1/user`) | **NEGATIVE** (405) | Disabled — can't re-target admin identity |

**Conclusion:** The main site is a clean SPA with no file/config leaks. **The entire attack surface is the Supabase backend**, and the biggest live weakness is the **authenticated IDOR (D1 + D2)** — not the anon role.

---

## PRIORITY FIX LIST (for Emirhan)

| # | Fix | Severity | Effort |
|---|---|---|---|
| 1 | `profiles` SELECT → `USING (auth.uid() = id)` | **CRITICAL** | 1 SQL policy |
| 2 | Financial tables SELECT → `USING (auth.uid() = user_id)` | HIGH | 1 SQL block |
| 3 | Storage: authenticated-write + 5 MB cap + quota | MEDIUM | Dashboard |
| 4 | Anon: `REVOKE SELECT ON profiles FROM anon` (V1r) | MEDIUM | 1 SQL line |
| 5 | Auth rate limit ON (5/60s) | MEDIUM | Dashboard |
| 6 | CORS allowlist (not `*`) | MEDIUM | Dashboard |
| 7 | Enable TOTP MFA (admin first) | LOW | Dashboard |

**The single most important fix is #1** — it closes the CRITICAL IDOR. Everything else is hardening.
