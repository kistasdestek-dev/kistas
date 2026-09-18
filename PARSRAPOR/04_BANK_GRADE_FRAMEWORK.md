# KISTAS.COM.TR — BANK-GRADE HARDENING FRAMEWORK

**Date:** 2026-09-18 06:29 UTC
**Executor:** Sayra-Core (PARS_DEVSTATE)
**Mandate:** "This system must be protected like a bank."
**Scope:** Financial platform (balances, IBAN, TCKN, credit transactions, orders, disputes).
**Confidence tags:** [PROVEN] live-verified · [PARTIAL] verified w/ limits · [UNVERIFIED] not externally testable

---

## 0. TRANSPORT LAYER — ALREADY BANK-GRADE [PROVEN 2026-09-18 06:29 UTC]

Verified live — **no action needed**, document as the baseline:

| Control | Value | Status |
|---|---|---|
| TLS | **TLSv1.3**, `TLS_AES_256_GCM_SHA384`, cert `Google Trust Services WE1`, verify OK | ✅ |
| HSTS | `max-age=31536000; includeSubDomains; preload` (main + Supabase) | ✅ |
| CSP | `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'` | ✅ |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` | ✅ |
| MIME sniff | `X-Content-Type-Options: nosniff` | ✅ |
| Referrer | `strict-origin-when-cross-origin` | ✅ |
| Permissions | `camera=(), microphone=(), geolocation=()` | ✅ |
| WAF/CDN | Cloudflare (`server: cloudflare`, `cf-ray` present) | ✅ |

**One CSP tightening (recommended):** `script-src` includes `'unsafe-inline'` + `'wasm-unsafe-eval'`. For bank-grade, migrate inline scripts to hashed/nonces (`'sha256-...'`) and drop `'unsafe-inline'` to close the XSS→financial-action path. Low priority (no stored-XSS sink found), but it is the one header a bank would not ship.

---

## 1. THE REAL GAPS (data / auth / financial-integrity layer)

A bank is not defined by TLS — it is defined by **confidentiality of financial data, integrity of transactions, non-repudiation (audit), and access control**. Those are where kistas is currently weak:

| # | Bank-grade control | Current state | Gap |
|---|---|---|---|
| B1 | **Field-level encryption** of financial PII (IBAN, TCKN, balance) | Columns **dropped**, not encrypted | Data is gone, not protected — re-adding it naively re-opens V1 |
| B2 | **MFA on privileged + financial actions** | Admin = password only, no rate limit | Single password = full platform + funds control |
| B3 | **Immutable audit log** of every financial mutation | `admin_action_audit` exists (RLS-locked) but no trigger on `credit_transactions`/`orders`/`profiles.balance` | No non-repudiation for fund movement |
| B4 | **Transaction integrity** (double-entry, idempotency, atomicity) | `credit_transactions` table exists, empty | No proof funds can't be double-spent / negative |
| B5 | **Data-integrity bug** | Modifying `is_verified`/`boost_credits`/`available_balance` on own profile **DELETES the row** (self-destruct trigger) [PROVEN] | A user (or bug) can wipe their own financial record |
| B6 | **Anomaly / fraud detection** | None | No velocity limits on balance changes, no alerting |
| B7 | **Session / JWT hardening** | Supabase default JWT | No short-lived refresh rotation, no device binding |
| B8 | **KVKK + PCI-DSS alignment** | No documented DPO, no data-subject rights flow, no card-data scope statement | Compliance exposure (Turkish KVKK = GDPR-equivalent) |
| B9 | **Backup / DR / RPO-RTO** | Unknown | A bank needs tested restore + defined RPO/RTO |
| B10 | **Secrets management** | Service-role key in server env | Must be out of code, rotated, least-privilege |
| B11 | **App functional integrity** | **NEW REGRESSION [PROVEN 2026-09-18 06:33 UTC]:** owner's latest patch `REVOKE`d `profiles` from `authenticated` too → logged-in users get **403 on read AND write of their own profile** (hint: `GRANT SELECT, UPDATE ON public.profiles TO authenticated`). Core profile path broken for every user. All other tables (listings, orders, credit_transactions, conversations, messages) remain 200 for authenticated. |

---

## 2. BANK-GRADE CONTROL IMPLEMENTATION

### B1 — Field-level encryption (do NOT just re-add plaintext columns)

When IBAN / TCKN / balance return to the schema, store them **encrypted at the column level**, not as plaintext:

```sql
-- Use pgcrypto (enable extension) + per-row or app-managed keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Option A (simple, DB-managed key): encrypt with a symmetric key.
--   NEVER store the key in the same table. Keep it in Supabase secrets / KMS.
ALTER TABLE public.profiles
  ADD COLUMN iban_enc      bytea,
  ADD COLUMN identity_enc  bytea;

-- Write:  encrypt_iv(encode('APP_KMS_KEY','base64'), 'plain-iban', 'aes256')
-- Read:   convert_from(decrypt_iv(iban_enc, encode('APP_KMS_KEY','base64'),'aes256'),'UTF8')
```
**Bank-grade requirement:** the encryption key lives in a **KMS / Supabase secret**, rotated on a schedule, and the DB role that reads it is separate from the role that writes it (segregation of duties). Anon/authenticated roles must **never** see `iban_enc` in plaintext — serve it only through a `SECURITY DEFINER` function that decrypts for the owner/admin and returns `NULL` otherwise.

### B2 — MFA + privileged-access control

- **Admin account** (`kistasdestek@gmail.com`): enable **TOTP MFA** (Supabase Auth → MFA). Password alone must not grant admin.
- **Financial actions** (balance change, payout, dispute resolution): require **step-up MFA** (re-authenticate) — not just a valid session.
- **Admin determination** stays server-side (email/role match in RPC) — already correct [PROVEN]; keep it out of client-writable profile fields.
- Apply the auth rate limit from [`03_AUTH_CORS_HARDENING.md`](03_AUTH_CORS_HARDENING.md) so MFA can't be brute-forced around.

### B3 — Immutable audit log (non-repudiation)

Every financial mutation must append to a **tamper-evident** log. See [`05_FINANCIAL_INTEGRITY.sql`](05_FINANCIAL_INTEGRITY.sql):
- `BEFORE/AFTER` triggers on `credit_transactions`, `orders`, `profiles` (balance/verification columns), `disputes`.
- Audit rows carry: `who` (auth.uid()), `when` (timestamptz), `what` (op), `before`/`after` JSONB, `request_id` (idempotency).
- Audit table: **no UPDATE/DELETE grants to any role except service_role**; consider a hash-chain column (`prev_hash`) for tamper-evidence.

### B4 — Transaction integrity

- Enforce **double-entry**: every credit/debit is a pair of `credit_transactions` rows that sum to zero (checked by a constraint or trigger).
- **Idempotency key** on every financial RPC (`request_id` unique) → replay-safe.
- **Atomicity**: balance update + transaction insert in one transaction; `available_balance >= 0` CHECK constraint.
- **No negative balance / no double-spend**: `CHECK (available_balance >= 0)` + row-level `FOR UPDATE` lock on the profile row during mutation.

### B5 — Fix the self-destruct trigger [PROVEN bug]

The current trigger **deletes** the profile row when `is_verified`/`boost_credits`/`available_balance` change on the owner's own row. For a bank this is a **data-loss / integrity** defect (a user can wipe their own financial record; a bug can mass-wipe). Replace with an **append-only audit + authorization gate**:
```sql
-- Do NOT delete. Instead: only service_role/admin may change these columns;
-- any authenticated self-change is rejected (or audited + allowed per policy).
CREATE OR REPLACE FUNCTION public.guard_financial_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
   IF (TG_OP = 'UPDATE'
       AND (NEW.is_verified      IS DISTINCT FROM OLD.is_verified
         OR NEW.available_balance IS DISTINCT FROM OLD.available_balance
         OR NEW.boost_credits     IS DISTINCT FROM OLD.boost_credits))
      AND NOT public.is_platform_admin(auth.uid())
   THEN
      RAISE EXCEPTION 'FORBIDDEN: financial fields are admin-only' USING ERRCODE='P0001';
   END IF;
   RETURN NEW;
END $$;
```
This converts a silent data-deletion into an explicit, auditable authorization decision.

### B6 — Anomaly / fraud detection

- **Velocity rules:** max N balance changes / M payouts per user per hour; alert on breach.
- **Threshold alerts:** any single movement > X → require step-up MFA + notify admin.
- **New-device / new-IP** on financial action → challenge.
- Implement as Postgres triggers writing to an `anomaly_events` table + an async notifier (edge function / cron).

### B7 — Session / JWT hardening

- Short-lived access tokens + **rotating refresh tokens** (Supabase: enable refresh-token rotation).
- **Revoke on risk** (password change, MFA change, admin action).
- Bind sensitive actions to a **recent successful auth** (step-up), not just token validity.

### B8 — KVKK + PCI-DSS alignment (compliance)

- **KVKK (Turkish GDPR):** appoint DPO, publish privacy notice, implement data-subject rights (access/erase/portability) as audited RPCs, log consent (`user_consents` table exists — wire it).
- **PCI-DSS scope:** if card data is ever stored, keep it **out of the DB** (tokenize via a payment processor — Stripe/iyzico). Never store PAN/CVV. If only IBAN is stored, it is **not** card data, but treat it as high-sensitivity PII.
- **Data minimization:** don't collect TCKN/IBAN until the feature that needs them ships.

### B9 — Backup / DR

- Supabase **PITR + daily snapshots**; test a **full restore** quarterly.
- Define **RPO ≤ 1h, RTO ≤ 4h** (bank-appropriate for a small platform).
- Offsite + encrypted backups; separate credentials from the app.

### B10 — Secrets management

- Service-role key: out of code, in server env / secret store, **rotated quarterly**, least-privilege.
- Publishable key is public by design (fine), but confirm it is the **only** key in the JS bundle [PROVEN negative 2026-09-17].
- KMS key for B1 field encryption: separate owner, rotation schedule, access audit.

---

## 3. PRIORITY ORDER (bank-grade rollout)

| Priority | Item | Why first |
|---|---|---|
| **P0** | B5 self-destruct fix + B3 audit triggers | Active data-integrity defect + no non-repudiation |
| **P0** | B2 admin MFA + auth rate limit | Cheapest close of the highest-value attack (admin takeover → funds) |
| **P1** | B1 field-level encryption + B4 transaction integrity | Core bank property: confidentiality + integrity of money |
| **P1** | B6 anomaly detection | Fraud prevention |
| **P2** | B7 session hardening, B8 compliance, B9 DR, B10 secrets | Operational + regulatory maturity |

---

## 4. RESIDUAL RISK (bank-grade honest assessment)

- The platform is **early-stage (8 users, empty financial tables)** — the *structural* bank controls (audit, double-entry, MFA, encryption) are what must be built **before** real funds flow, not after.
- `[UNVERIFIED]` externally: DB trigger bodies, RPC internals, Supabase project settings, backup config. The SQL in [`05_FINANCIAL_INTEGRITY.sql`](05_FINANCIAL_INTEGRITY.sql) is the authoritative replacement; the owner must apply it in the Supabase SQL editor.
- A bank-grade posture is **not a one-time patch** — it is a continuous control (weekly audit re-run + quarterly pen-test + annual compliance review).

**Next scheduled review: 2026-12-17 (quarterly).**
