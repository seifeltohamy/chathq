# Multi-Tenant ChatHQ on Supabase + Railway — Phased Plan

> Status (2026-05-20): **Phase 0 (docs) shipped today** alongside this pivot. Phases 1–5 ⏳ Planned, all blocked on user provisioning Supabase project + sharing env values. AI Knowledge Base + Gemini agent (originally Phases 6–7) explicitly out of scope per 2026-05-18 decision. Phase 8 (migration from current env/file/Gist creds → Postgres) only relevant if existing self-hosted users need upgrading — deferred. Originally drafted as `projectUpgrade.md` at repo root with a Vercel + Auth.js + Drizzle stack; pivoted to Supabase (DB + Auth) + Railway hosting on 2026-05-20.

## Context

The app today is single-tenant (one Instagram account configured via `.env` or the `/settings` UI) and uses static keyword-triggered DMs. The goal is to turn it into a multi-user SaaS where each signed-up user brings their own Zernio API key, configures it through onboarding, and gets a per-user dashboard.

This is a major refactor — not a feature add. Auth, persistent multi-tenant storage, per-user Zernio clients, and webhook-based tenant routing all need to land for the feature to work end-to-end. The plan is phased so each step is independently shippable.

## Architecture decisions

| Concern | Choice | Why |
|---|---|---|
| Auth | **Supabase Auth** (`@supabase/ssr`) | One platform for DB + auth. No bcrypt / NextAuth glue. `auth.users` is managed; we extend it with `profiles`. |
| DB | **Supabase Postgres** | Multi-tenant needs joins, FKs, unique indexes. Supabase exposes plain Postgres + a managed auth schema. |
| ORM | **Drizzle ORM** (`drizzle-orm/postgres-js`) | Typed schema, no codegen, works against any Postgres including Supabase. Portable if we ever leave Supabase. |
| Tenant routing | `profiles.zernio_account_id` (unique) looked up from webhook payload `account.id` (TBD field — verify in Phase 5) | Single webhook URL; dispatch by IG account ID. |
| Credential storage | AES-256-GCM via [lib/crypto.ts](../../lib/crypto.ts), key from `ENCRYPTION_KEY` env | Zernio + Brevo keys encrypted at rest in Postgres. |
| Hosting | **Railway** (Nixpacks auto-detects Next.js) | User's pick. Persistent process, no serverless cold starts, native cron service. |
| Cron | **Railway native cron** (per-service schedule hitting `/api/poller`) | In-platform, no external dependency. |

## Cross-cutting concerns

Apply to every phase below:

- **`userId` first** — once Phase 2 lands, every storage call, every Zernio client, every API route is scoped by `userId`. No "default user". Grep for hardcoded single-tenant assumptions before each phase ships.
- **Never log raw API keys.** Mask at the boundary; log only the prefix + last 4.
- **Server-side credential validation only.** Don't trust client-submitted Zernio keys without calling Zernio to verify.
- **Webhook is public** — tenant routing happens via payload. Document this tradeoff in [.claude/audit-checklist.md](../audit-checklist.md).
- **Don't touch dev CLI scripts** ([scripts/list-accounts.js](../../scripts/list-accounts.js), [scripts/create-automation.js](../../scripts/create-automation.js)) — stay reading `.env` for solo dev workflows.

## Data model (`lib/db/schema.ts`)

`auth.users` is Supabase-managed (email, password, sessions, etc.). Our tables extend it:

- **profiles** — `user_id` (PK, FK→`auth.users.id`), `ig_username`, `zernio_api_key_enc`, `zernio_profile_id`, `zernio_account_id` (unique), `brevo_api_key_enc`, `brevo_from_email`, `onboarded_at`, timestamps.
- **email_collect_configs** — composite PK `(user_id, automation_id)`, replaces the existing KV/Gist/file tier.
- **processed_conversations** — composite PK `(user_id, conversation_id)`, `last_processed_msg_id`, `last_replied_at` — replaces in-memory `Set`, drives dedup + 30s per-convo throttle.

Full column list lives in [.claude/db-schema.md](../db-schema.md). AI-related tables (`ai_contexts`, `ai_message_log`) are out of scope and not modelled.

---

## Phase 0 — Pivot to Supabase + Railway (docs only) ✅ Shipped 2026-05-20

**Size:** ~10 min. **User value:** subsequent phases reference correct stack.

**What ships:** Doc updates only. No code changes.

- [.claude/Planning/multi-tenant-ai.md](../Planning/multi-tenant-ai.md) — this file. Architecture decisions, data model, Phase 1–5 blocks rewritten.
- [.claude/db-schema.md](../db-schema.md) — `users` table renamed to `profiles`; AI tables removed.
- [CLAUDE.md](../../CLAUDE.md) — Stack table + Current State updated.
- [.claude/session-handoff.md](../session-handoff.md) — TL;DR entry for 2026-05-20 pivot.
- [.claude/checklist.md](../checklist.md) — Phase 0 entry.

---

## Phase 1 — DB + crypto foundation ✅ Shipped 2026-05-20

**Size:** ~0.5 day. **Dependencies:** Supabase project provisioned, `DATABASE_URL` + Supabase keys + `ENCRYPTION_KEY` in hand. **User value:** Drizzle schema lives in Supabase; encryption helpers ready for Phase 3.

**Deps added:** `drizzle-orm`, `drizzle-kit`, `postgres`, `@supabase/supabase-js`, `@supabase/ssr`.

**Env vars** (`.env.example` placeholders):
- `DATABASE_URL` — Supabase **direct** connection (port 5432) since Railway is long-running.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` (`openssl rand -hex 32`)

**New files:**
- [lib/crypto.ts](../../lib/crypto.ts) — AES-256-GCM. `encrypt(plain) → base64(nonce || ciphertext || authTag)` / `decrypt(b64)`. Random 12-byte nonce. Key parsed once at module load; throws fast if missing/invalid.
- [lib/db/schema.ts](../../lib/db/schema.ts) — Drizzle schema for `profiles`, `email_collect_configs`, `processed_conversations`. FKs to `auth.users(id)` via raw SQL (`auth` is a separate Supabase schema).
- [lib/db/index.ts](../../lib/db/index.ts) — Drizzle client over `postgres-js`. Singleton. `postgres(DATABASE_URL, { prepare: false })`.
- [drizzle.config.ts](../../drizzle.config.ts) — schema path + `drizzle/` migrations dir + `DATABASE_URL`.

**Modified:**
- [package.json](../../package.json) — scripts: `db:generate`, `db:push`, `db:migrate`.
- [.env.example](../../.env.example) — add the new variables.

**Verification:**
- `npm install` clean.
- `npm run db:generate` produces a migration in `drizzle/` covering all 3 tables + FKs into `auth.users`.
- Apply via Supabase SQL Editor; confirm in Studio.
- Crypto round-trip works (`tsx scripts/test-crypto.ts` or inline node command).
- `npx tsc --noEmit` clean.
- Existing single-tenant flows unaffected.

**Not in scope:** application code doesn't read these tables yet — that's Phase 3.

**Inline review (what actually shipped):**
- Shadow `auth.users` declaration via `pgSchema('auth').table('users', ...)` to get type-safe FKs in queries. drizzle-kit emits a `CREATE TABLE "auth"."users"` for it; I patched the generated SQL to use `IF NOT EXISTS` so it's a safe no-op on Supabase. **Future regenerations of `drizzle/0000_*.sql` need the same patch** — see top-of-file comment in the migration.
- Drizzle client singleton lives on `global._dbClient` so HMR doesn't leak connections (same pattern as the old `_zernioClient`).
- Crypto module uses lazy key loading (`getKey()` on first call) instead of eager parse-at-import. Keeps the dev server bootable without `ENCRYPTION_KEY` set — fails fast only when something actually tries to encrypt.

---

## Phase 2 — Auth (Supabase, login/signup/middleware) ✅ Shipped 2026-05-20

**Size:** ~1 day. **Dependencies:** Phase 1. **User value:** login screen, sessions persist, dashboard gates behind `requireUser()`.

**New files:**
- [lib/supabase/server.ts](../../lib/supabase/server.ts) — `createSupabaseServerClient()` using `@supabase/ssr` `createServerClient` + `cookies()`.
- [lib/supabase/middleware.ts](../../lib/supabase/middleware.ts) — `updateSession(request)` for token refresh.
- [lib/auth-helpers.ts](../../lib/auth-helpers.ts) — `requireUser()` for route handlers (throws 401), `getCurrentUser()` for server components, `getProfile(userId)` for our `profiles` row.
- [middleware.ts](../../middleware.ts) — calls `updateSession`, redirects unauthenticated users. Matcher excludes `/api/webhook`, `/auth/*`, `/login`, `/signup`, `_next/*`, static assets.
- [app/login/page.tsx](../../app/login/page.tsx) — email/password login (`signInWithPassword`).
- [app/signup/page.tsx](../../app/signup/page.tsx) — signup (`signUp`). On success, inserts `profiles` row via service-role client server action, redirect to `/onboarding`.
- [app/auth/callback/route.ts](../../app/auth/callback/route.ts) — Supabase auth callback (future-proof for magic-link/OAuth).
- [app/api/me/route.ts](../../app/api/me/route.ts) — returns current user + profile.

**Modified:**
- [components/Sidebar.tsx](../../components/Sidebar.tsx) line 71 — read IG handle from `/api/me`. Add sign-out button.
- [components/CredentialsBanner.tsx](../../components/CredentialsBanner.tsx) — read from `/api/me`, check `profile.zernio_api_key_enc` presence.

**Verification:**
- `/signup` creates `auth.users` row + `profiles` row; redirects to `/onboarding`.
- `/login` works; session survives reload.
- `/api/automations` without cookie → 401.
- `/api/me` returns user + profile.

---

## Phase 3 — Per-user Zernio refactor + email-collect over Drizzle ✅ Shipped 2026-05-20

**Size:** ~0.5 day. **Dependencies:** Phase 2. **User value:** logged-in user's API calls use their own creds; storage migrates to Postgres.

**Modified:**
- [lib/zernio.ts](../../lib/zernio.ts) — remove credentials-store-based getters. New: `getZernioForUser(user) → { client, profileId, accountId }`. Reads `profiles.zernio_api_key_enc`, decrypts, fresh client per call.
- [lib/email-collect-store.ts](../../lib/email-collect-store.ts) — rewrite over Drizzle. **Keep public function names** (`getConfigs`, `upsertConfig`, `deleteConfig`, `getConfigForConversation`, `isProcessed`, `markProcessed`) — add `userId` first arg.
- [lib/credentials-store.ts](../../lib/credentials-store.ts) — mark legacy, used only by migration script (if added). App routes stop importing.
- All 6 API routes — switch to `requireUser()` → `getZernioForUser(user)`:
  - [app/api/automations/route.ts](../../app/api/automations/route.ts), [app/api/automations/[id]/route.ts](../../app/api/automations/[id]/route.ts)
  - [app/api/reels/route.ts](../../app/api/reels/route.ts), [app/api/analytics/route.ts](../../app/api/analytics/route.ts)
  - [app/api/email-collect/route.ts](../../app/api/email-collect/route.ts), [app/api/email-collect/[id]/route.ts](../../app/api/email-collect/[id]/route.ts)
- [app/api/credentials/route.ts](../../app/api/credentials/route.ts) — thin wrapper writing encrypted to `profiles`. DELETE clears.

**Not modified:** [scripts/list-accounts.js](../../scripts/list-accounts.js), [scripts/create-automation.js](../../scripts/create-automation.js) keep reading `.env`.

**Verification:**
- Logged in without Zernio creds → `/api/reels` returns 401 + `{ needsCredentials: true }`.
- Configure creds via `/settings`; reels load.
- Two users see only their own automations / email-collect configs.

---

## Phase 4 — Onboarding wizard + Settings rebuild ✅ Shipped 2026-05-20 (onboarding wired; settings tab-rework deferred)

**Size:** ~1 day. **Dependencies:** Phases 2 + 3. **User value:** smooth first-run flow.

**New files:**
- [app/onboarding/page.tsx](../../app/onboarding/page.tsx) — 3 steps: paste Zernio key → server validates + lists profiles/accounts → pick → save to `profiles`. Reuse [.claude/patterns.md](../patterns.md) page chrome.
- [app/api/onboarding/zernio-key/route.ts](../../app/api/onboarding/zernio-key/route.ts) — POST validates key, returns profiles + IG accounts.
- [app/api/onboarding/complete/route.ts](../../app/api/onboarding/complete/route.ts) — POST writes encrypted key + IDs + IG username to `profiles`, sets `onboarded_at`.

**Modified:**
- [app/settings/page.tsx](../../app/settings/page.tsx) — tabs: **Integrations** (masked Zernio + Brevo keys, rotate), **Email Collect** (existing per-automation rows, rescoped), **Account** (sign out, delete).
- [middleware.ts](../../middleware.ts) — authenticated + `profiles.onboarded_at IS NULL` + path != `/onboarding` → redirect to `/onboarding`.

**Verification:**
- Fresh signup lands on `/onboarding`.
- Invalid Zernio key shows inline error.
- Valid key surfaces profile + IG account dropdowns.
- Completing wizard sets `onboarded_at`, lands at `/`, dashboard works.

---

## Phase 5 — Webhook tenant routing + Railway cron poller ✅ Shipped 2026-05-20 (code; Railway config still manual)

**Size:** ~0.5 day. **Dependencies:** Phases 1–4. **User value:** multi-tenant production-ready on Railway.

**Modified:**
- [app/api/webhook/route.ts](../../app/api/webhook/route.ts):
  - Top of handler: confirm IG account ID payload field (`payload.account.id` vs `payload.message.accountId` vs `payload.conversation.accountId`) using the `FULL PAYLOAD` log at [line 13](../../app/api/webhook/route.ts#L13). **Required check before wiring.**
  - Lookup `profiles WHERE zernio_account_id = <payload account id>`. No match → bail silently (don't leak which IDs exist).
  - **Keep** the early `no-email-in-text` bail at lines 28–30 (the original "remove it" was for the AI agent path which is out of scope).
  - Downstream code uses the resolved per-user Zernio client.
- [app/api/poller/route.ts](../../app/api/poller/route.ts):
  - Replace single-tenant flow with `SELECT DISTINCT user_id FROM email_collect_configs`, iterate, build per-user client + run existing inbox-scan logic.
  - Keep `POLLER_SECRET` gate; Railway cron sends the header.

**Railway config (manual, not code):**
- Connect repo. Nixpacks auto-detects Next.js.
- Env vars from Phase 1 + `POLLER_SECRET`.
- Cron service: `*/5 * * * * curl -s -H "x-poller-secret: $POLLER_SECRET" https://<railway-domain>/api/poller`.
- Set Zernio webhook URL → `https://<railway-domain>/api/webhook`.

**Verification:**
- Two test users with two different Zernio IG accounts — webhook fires correctly per tenant. User A's automation never triggers user B's DM.
- Email-collect still fires when user A's commenter replies with an email.
- Direct hit to `/api/poller` without secret → 401. With secret → per-user summary.

---

## Phases 6–7 — ❌ OUT OF SCOPE

AI Knowledge Base page (was Phase 6) and Gemini auto-reply agent (was Phase 7) explicitly dropped per 2026-05-18 scope decision. Kept here as historical context only — do not implement.

## Phase 8 — Migration script ⏳ Deferred (conditional)

Only relevant if existing self-hosted users need to upgrade from current `.env`/file/Gist credentials → Postgres. If/when invoked, write [scripts/migrate-from-env.ts](../../scripts/migrate-from-env.ts) that reads existing creds and inserts encrypted into `profiles` for a seed admin.

---

## API surface (new + rescoped)

| Method | Path | Auth |
|---|---|---|
| Supabase auth | `signUp`, `signInWithPassword`, `signOut` via `supabase.auth.*` (client-side) | Public |
| GET | `/api/me` | Required |
| GET | `/auth/callback` | Public (Supabase redirect) |
| POST | `/api/onboarding/zernio-key` | Required |
| POST | `/api/onboarding/complete` | Required |
| GET / POST | `/api/email-collect` | Required (rescoped) |
| DELETE | `/api/email-collect/[id]` | Required (rescoped) |
| GET / PATCH / DELETE | `/api/automations[/id]` | Required (rescoped) |
| GET | `/api/reels`, `/api/analytics` | Required (rescoped) |
| GET | `/api/poller` | `POLLER_SECRET` header (multi-tenant fan-out) |
| POST | `/api/webhook` | Public, tenant resolved by `account.id` |
| GET / POST / DELETE | `/api/credentials` | Required (writes to `profiles`) |

## Reuse worth highlighting

- **Storage adapter signatures** in [lib/email-collect-store.ts](../../lib/email-collect-store.ts) — keep function names, just thread `userId` + swap backend to Drizzle. Call sites barely change.
- **Page chrome pattern** — `p-10 max-w-2xl/3xl` + mono eyebrow + h1 (clone from [app/settings/page.tsx](../../app/settings/page.tsx) and [app/sequences/page.tsx](../../app/sequences/page.tsx)).
- **Form panel + input classes** — `bg-surface border border-border rounded-2xl p-6` shell, `bg-raised border border-border rounded-xl focus:border-green/40` inputs, `bg-green text-bg hover:bg-[#16a34a]` primary.
- **DM preview newline handling** — `whitespace-pre-wrap break-words` already established; carry through onboarding + settings UIs.
- **Tailwind tokens** in [tailwind.config.mjs](../../tailwind.config.mjs) — never hardcode hex.
- **Zernio SDK call shapes** — same in webhook lines 81-84.

## Open question to resolve in Phase 5

Webhook payload account-id field — must be confirmed against the `FULL PAYLOAD` log at [app/api/webhook/route.ts:13](../../app/api/webhook/route.ts#L13) before wiring tenant routing. Could be `payload.account.id`, `payload.message.accountId`, or `payload.conversation.accountId`.

## Suggested execution order

| Sprint | Phase | Why this slot |
|---|---|---|
| 1 | **Phase 1** — DB + crypto | Unblocks every other phase. Lowest-risk infra. |
| 1 | **Phase 2** — Auth | Unblocks `userId`-scoped work. |
| 2 | **Phase 3** — Per-user Zernio refactor | Smallest change to existing routes; pays off quickly. |
| 2 | **Phase 4** — Onboarding + Settings | First-run flow for newly-signed-up users. |
| 3 | **Phase 5** — Webhook routing + Railway cron poller | Production-ready multi-tenant; needs Railway URL. |
