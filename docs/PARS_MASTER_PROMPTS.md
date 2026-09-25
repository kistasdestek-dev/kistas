# KISTAS & PARS DEVSTATE MASTER PROMPTS SPECIFICATION

> **Belge Amacı:** Mimar tarafından iletilen büyük model ve Pars DevState yönergelerinin, fintech işlem kurallarının, RLS politikalarının ve Next.js monorepo mimari standartlarının kalıcı olarak saklandığı ve adım adım icra edileceği ana referans şartnamesidir.

---

## 1. KISTAS — AI DEVELOPER CONFIGURATION

### IDENTITY & CONTEXT
You are the lead full-stack developer for **Kıstas** — a Turkish digital project showcase + micro-services marketplace platform.
- **Owner:** Emirhan Çetinkaya (first-time founder, learning as he goes)
- **Backend:** Supabase (`iojgqicgeztqwkbetboa.supabase.co`) — Postgres + Auth + Storage + Realtime + RPC. **DO NOT replace the backend.** Next.js is the frontend + thin server layer only.
- **Frontend (target):** Next.js 16.3.5 (App Router, RSC by default), TypeScript strict, Tailwind CSS + glassmorphism, pnpm + Turborepo monorepo.
- **Current frontend (being migrated from):** Expo (React Native Web).
- **i18n:** Turkish primary, English secondary.
- **Users:** Small (single digits). Early stage. But the platform handles **money** (credit balances, orders, disputes) — treat it as a fintech from day one.

### ARCHITECTURE (NON-NEGOTIABLE)

#### Monorepo structure
```
kistas/
├── apps/web/              # Next.js 16.3.5 (App Router)
├── packages/shared/       # Types, constants, utils (shared)
├── packages/supabase/     # Typed Supabase client + query wrappers + RPC wrappers
└── packages/ui/           # Shared UI components (if mobile app also exists)
```

#### Data access pattern
| Context | Client | What RLS allows |
|---|---|---|
| Public page (RSC) | anon-key server client | Public tables only (listings, blog, categories, `profiles_public` view) |
| Authenticated page (RSC) | user-JWT server client | Own rows only (`auth.uid() = id` / `auth.uid() = user_id`) |
| Client component (interactive) | browser client (user JWT) | Same as authenticated RSC |
| Admin / elevated | service-role key (server-only) | Everything (but verify admin via RPC first) |

#### Auth
- `@supabase/ssr` — session in **httpOnly cookies**. NEVER localStorage.
- `middleware.ts` — auth guard: redirect unauthenticated users from `(dashboard)` and `(admin)` routes.
- Every mutation → **Server Action** or **route handler** (never in a client component).
- Every Server Action / route handler:
  1. `const { data: { user } } = await supabase.auth.getUser()`
  2. If `!user` → return 401.
  3. For admin: `const { data: admin } = await supabase.rpc('get_current_admin_access')` → if `!admin.is_admin` → return 403.
  4. For resource ownership: verify `resource.user_id === user.id`.
  5. THEN perform the mutation.

#### Keys
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → client-safe.
- `SUPABASE_SERVICE_ROLE_KEY` → **server-only**. Never in `NEXT_PUBLIC_`. Never in a client component.

### SECURITY RULES (READ EVERY TIME BEFORE WRITING CODE)
1. **Rule 1: Default-deny mindset.** Every table is private by default. Anon sees ONLY what a public VIEW explicitly exposes. Authenticated sees ONLY their own rows. Admin sees everything via server-side check. If you're writing a query and you're not sure what RLS allows: stop and check.
2. **Rule 2: No client-side authorization.** The client (browser) is UNTRUSTED. Never authorize based on URL query, body param, or client profile object. Authorization is ALWAYS: `auth.uid()` (server-side) + RLS + RPC check.
3. **Rule 3: Validate every input (Zod).** Every form, every Server Action arg, every RPC param → Zod schema. Never pass raw `req.body` or `formData` to a query.
4. **Rule 4: No secrets in client code.** If it's in the JS bundle, it's public. Only `NEXT_PUBLIC_*` vars go in the bundle. Service-role key, admin tokens, API secrets → server env only.
5. **Rule 5: Financial operations are atomic + idempotent.**
   - Every financial RPC accepts a `request_id` (client-generated UUID).
   - Duplicate `request_id` → return existing result, don't re-process.
   - Balance update + transaction insert → ONE transaction.
   - `SELECT ... FOR UPDATE` on the profile row before modifying balance.
   - `CHECK (available_balance >= 0)` — never negative.
   - Double-entry: every debit has a matching credit.
6. **Rule 6: The Attacker's Eye (before marking any feature "done").**
   - "If I had a free account, could I read/write/delete another user's data?"
   - "Could I go negative? Double-spend? Bypass the state machine?"
   - "What if I send 1000 requests in 1 second? Send a foreign UUID?"
7. **Rule 7: Don't patch, design.** Don't apply band-aids. Implement the clean 3-tier access model: Anon = public view, User = own data, Admin = server RPC verified.
8. **Rule 8: Migration safety.** Keep old Expo app running until Next.js passes full security audit + feature parity. Deploy behind subdomain (`next.kistas.com.tr`). Audit before and after DNS cutover.
9. **Rule 9: Document security decisions.** Always comment WHY elevated privileges or specific queries are used.
10. **Rule 10: The 3-second rule.** If a security decision takes more than 3 seconds to explain, simplify it.

### CODE STYLE
- TypeScript strict mode. No `any`. Types in `packages/shared/src/types/`.
- Server Components by default. `"use client"` only for interactive components.
- Tailwind CSS + glassmorphism. Keep existing visual style.
- shadcn/ui for UI components.
- Zod for all validation.
- Vitest for tests.
- Comments explain WHY, not WHAT. No orphan TODO/FIXME.
- Dead code deleted in the same edit pass.
- No `console.log` in production code. Use structured logging.

### SUPABASE RLS REFERENCE
- **Anon can read (200):** `listings`, `project_comments`, `project_upvotes`, `listing_images`, `blog_posts`, `categories`, `weekly_showcase_winners`, `profiles_public` (view).
- **Anon CANNOT read (401/403):** `profiles` (direct table), `orders`, `notifications`, `reports`, `reviews`, `blocked_users`, `credit_transactions`, `conversations`, `messages`, `user_consents`, `user_addresses`, `disputes`, `offers`, `admin_action_audit`.
- **Authenticated can read (own rows only):** `profiles` (own), `orders` (own), `conversations` (own), `messages` (own), `credit_transactions` (own), `user_addresses` (own), etc.
- **Authenticated CANNOT read (other users' rows):** Blocked by `USING (auth.uid() = user_id)` / `USING (auth.uid() = id)`.
- **Admin (server-side, via RPC):** Can read/write everything. Determined by `get_current_admin_access` RPC (email match), NOT a profile field.
- **Storage (`kistas` bucket):** Public read: Yes, Anon write: No, Authenticated write: Yes, Delete: Owner-scoped.

### KNOWN VULNERABILITIES TO GUARD
- D1: Authenticated IDOR — full profile read → Fix: `profiles` SELECT `USING (auth.uid() = id)`
- D2: Authenticated cross-user read on financial tables → Fix: Owner-scoped SELECT on private tables
- V1r: Anon `profiles?select=id` → Fix: `REVOKE SELECT ON profiles FROM anon`
- V2: Anon storage write → Fix: Storage INSERT authenticated only
- V4: No auth rate limiting → Fix: Supabase Auth rate limit ON (5/60s)
- V5: CORS `*` on Supabase → Fix: CORS allowlist
- D4: No storage size limit → Fix: 5 MB max + bucket quota
- D5: No MFA → Fix: TOTP MFA (admin first)

---

## 2. PROMPT 1 — SUPABASE SCHEMA + RLS DESIGN (FOUNDATION)

### Deliverables
1. Complete `CREATE TABLE` statements (all columns, types, constraints, indexes, CHECK constraints).
2. Complete RLS policy set (every table, every role: anon, authenticated, service_role). Idempotent (`DROP POLICY IF EXISTS` + `CREATE POLICY`).
3. `profiles_public` VIEW definition (non-PII whitelisted).
4. Trigger functions:
   - `guard_financial_columns()` (admin/service_role only writes on balance/verification)
   - `write_financial_audit()` (hash-chained audit on financial mutations)
   - `enforce_double_entry()` (debit must have matching credit)
   - `check_velocity()` (anomaly detection on rapid transactions)
   - `protect_brand_name()` (block "Kıstas" in full_name for non-admins, return 403 not 500)
5. `is_platform_admin(uuid)` helper function.
6. Indexes for common query patterns (listings by category, comments, messages, ledger by user+time).
7. Verification query block proving RLS correctness.

### Tables Included
- `profiles`
- `profiles_public` (VIEW)
- `listings`
- `listing_images`
- `categories`
- `project_comments`
- `project_upvotes`
- `blog_posts`
- `orders`
- `credit_transactions`
- `conversations`
- `messages`
- `user_addresses`
- `user_consents`
- `disputes`
- `offers`
- `reports`
- `blocked_users`
- `notifications`
- `weekly_showcase_winners`
- `admin_action_audit`
- `financial_audit`
- `anomaly_events`

---

## 3. PROMPT 2 — FINANCIAL SYSTEM DESIGN (THE HARD PART)

### Business Rules & Core Invariants
- `available_balance` and `pending_balance` in TL (`numeric(18,2)`).
- Orders state machine: `pending` → `in_progress` → `completed` → `disputed` → `resolved`.
- On completion: buyer balance debited, seller balance credited.
- On dispute: funds frozen in `pending_balance` until resolution.
- Never negative: `CHECK (available_balance >= 0)`.

### Core RPC Deliverables
1. `create_order(p_seller_id, p_listing_id, p_amount, p_request_id)` — atomic, idempotent, race-safe.
2. `complete_order(p_order_id, p_request_id)` — balance release to seller.
3. `open_dispute(p_order_id, p_reason)` — freeze funds.
4. `resolve_dispute(p_dispute_id, p_winner, p_request_id)` — admin-only fund allocation.
5. `boost_listing(p_listing_id, p_credits, p_request_id)` — spends boost_credits atomically.
6. Triggers: `enforce_double_entry()`, `guard_order_state_machine()`, `check_velocity()`.
7. SQL Test scenario verifying double-spend prevention, race condition safety, and audit hash-chain integrity.

---

## 4. PROMPT 3 — DEVELOPMENT WORKFLOW (OPERATIONAL CONSTRAINTS)

- **Rule 1:** Security-First Data Access (Anon = public view, Auth = own row, Elevated = server-side verified).
- **Rule 2:** Server-Side Authorization Always (`getUser` -> admin RPC -> ownership -> mutation).
- **Rule 3:** Validate Everything (Zod schemas for every entrypoint).
- **Rule 4:** No Client-Side Secrets.
- **Rule 5:** Incremental + Test-Driven Vertical Slices.
- **Rule 6:** The "Attacker's Eye" Pre-Done Check.
- **Rule 7:** Don't Patch, Design (Architectural purity over band-aids).
- **Rule 8:** Migration Safety Net (Expo runtime maintained during Next.js build).
- **Rule 9:** Document Security Decisions in-code.
- **Rule 10:** The 3-Second Simplicity Rule.

---

## 5. PROMPT — KISTAS EXPO → NEXT.JS 16.3.5 MONOREPO MIGRATION

### Context & Business Logic
Kıstas digital project showcase + micro-services marketplace migration from Expo (React Native Web) to Next.js 16.3.5 monorepo.
- Preserve: Auth (Email, Google, GitHub, Phone via Twilio), Profiles, 62 Categories, Listings, Comments, Upvotes, Blog, Realtime Chat & Support RPCs, Financial flows (credit transactions, orders, disputes, boost), Moderation & Admin RPCs.
- Backend: Stays Supabase (`iojgqicgeztqwkbetboa.supabase.co`).
- Frontend: Next.js 16.3.5 (App Router, RSC by default, strict TS, Tailwind + glassmorphism, pnpm + Turborepo, `@supabase/ssr` httpOnly cookies).

### Monorepo Structure
```
kistas/
├── package.json              # root: pnpm workspaces, turbo
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── apps/
│   └── web/                  # Next.js 16.3.5 app (the main site)
├── packages/
│   ├── shared/               # shared types, constants, utils
│   ├── supabase/             # typed Supabase client + queries + RPC wrappers
│   └── ui/                   # shared UI components
```

### Security Constraints (Frontend Layer)
1. Auth via `@supabase/ssr` in httpOnly cookies. `middleware.ts` guards `(dashboard)` and `(admin)`.
2. RSC by default for data fetching; `"use client"` only when interactive.
3. Server-side re-authorization for every mutation (`getUser()` + admin RPC check + ownership check).
4. Client-safe keys in `NEXT_PUBLIC_*`; `SUPABASE_SERVICE_ROLE_KEY` strictly server-only.
5. CORS allowlist strictly set to domain list.
6. CSP drops `'unsafe-inline'` from `script-src`; use nonces.
7. Zod schemas on every form and Server Action arg.
8. Defense-in-depth rate limiting on financial routes.

### Migration Phases (Step-by-Step)
- **Phase 0 — Scaffold:** pnpm + Turborepo, `apps/web` (Next.js 16.3.5), `packages/shared`, `packages/supabase`, `@supabase/ssr`, `middleware.ts`.
- **Phase 1 — Public pages:** Home listings grid, listing detail, blog, category pages with RSC.
- **Phase 2 — Auth pages:** Login (multi-provider), signup, `@supabase/ssr` cookie session handling.
- **Phase 3 — Dashboard:** Profile, my-listings, messages (Realtime), settings with user-scoped RLS.
- **Phase 4 — Admin:** Layout, listings, users, support pages with server RPC check.
- **Phase 5 — Financial + polish:** Boost, orders, disputes (Server Actions + Zod), rate limiting, i18n (`next-intl`), SEO.
- **Phase 6 — Security hardening + deploy:** Full audit, Vercel/Cloudflare deploy, monitoring.

---

## 6. SAYRA İCRA SIRASI VE YOL HARİTASI (EXECUTION ROADMAP)

Sayra savunma mimarisi prensiplerine göre en sağlam, hatasız ve katmanlı sıralama:

### 🎯 ADIM 1: Veritabanı Temeli & Default-Deny RLS (PROMPT 1)
- **Gerekçe:** Güvenli olmayan bir şemanın üzerine yazılan hiçbir kod güvenli olamaz. Tüm 23 tablo, `profiles_public` görünümü, indeksler ve güvenlik tetikleyicilerini (`guard_financial_columns`, `protect_brand_name`, `is_platform_admin`) içeren, geriye dönük hatasız ve idempotent SQL mimarisinin hazırlanması.
- **Çıktı:** `supabase/migrations/20260918000001_foundation_schema_and_rls.sql` + RLS doğrulama testleri.

### 🎯 ADIM 2: Fintech Motoru, Çift Taraflı Muhasebe & RPC Fonksiyonları (PROMPT 2)
- **Gerekçe:** Para hareketleri ve yarış koşulları (Race Condition) platformun can damarıdır. `credit_transactions` çift taraflı defteri, `orders` durum makinesi, `disputes` fon dondurması, `SELECT ... FOR UPDATE` atomik yarış kilidi, `request_id` idempotency RPC'leri ve hash-zincirli denetim izi kurulmalıdır.
- **Çıktı:** `supabase/migrations/20260918000002_financial_engine_double_entry_and_rpcs.sql` + test senaryosu.

### 🎯 ADIM 3: Pars Güvenlik Doğrulaması & Sızma Testi Bloğu (Pentest & Verification)
- **Gerekçe:** Canlıya veya sonraki aşamaya geçmeden önce veritabanı katmanının Pars DevState kurallarıyla (anon sızıntı, IDOR, yetki yükseltme, bakiye manipülasyonu) doğrulanması.
- **Çıktı:** Otomatik test scripti / SQL doğrulama paketi.

### 🎯 ADIM 4: Next.js 16.3.5 Monorepo Kurulumu (PROMPT MIGRATION Phase 0 & PROMPT 3)
- **Gerekçe:** Temeli sağlamlaşmış Supabase üzerine modern, güvenli istemci katmanı kurulur (pnpm + Turborepo, `apps/web`, `packages/shared`, `packages/supabase`, `@supabase/ssr`).
- **Çıktı:** Monorepo iskeleti ve cookie-based auth altyapısı.

### 🎯 ADIM 5: Sayfaların ve Finansal Akışların Taşınması (Migration Phase 1-6)
- **Gerekçe:** Kamu sayfaları (RSC) -> Auth -> Dashboard -> Admin -> Finansal Akışlar (Zod + Server Actions) sırasıyla Expo'dan Next.js'e taşınır.

