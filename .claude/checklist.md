# Feature-Shipping Log

> One entry per feature/phase landed. Newest at top.

## 2026-05-20 — Phases 3 + 4 + 5 (code) of multi-tenant rebuild ✅

Done in a single push since the changes are interlocking.

**Phase 3 — Per-user Zernio + email-collect over Drizzle**
- [lib/zernio.ts](../lib/zernio.ts) — replaced env-based `getZernio()`/`getProfileId()`/`getAccountId()` with `getZernioForUser(user)` that decrypts `profiles.zernio_api_key_enc` and returns `{ client, profileId, accountId }`. New `NoCredentialsError` for 401 path.
- [lib/email-collect-store.ts](../lib/email-collect-store.ts) — rewritten over Drizzle (`emailCollectConfigs` + `processedConversations` tables). Public function names preserved; `userId` is now the first arg everywhere.
- All 6 API routes refactored to `requireUser()` → `getZernioForUser(user)`: `automations/`, `automations/[id]`, `reels/`, `analytics/`, `email-collect/`, `email-collect/[id]`.
- [app/api/credentials/route.ts](../app/api/credentials/route.ts) — now persists encrypted key to `profiles` table via Drizzle (no more KV/Gist/file). DELETE nulls the encrypted columns.

**Phase 4 — Onboarding wizard**
- New: [app/onboarding/page.tsx](../app/onboarding/page.tsx) — 3-step wizard (paste key → pick profile + IG account → save). Reuses StepBar pattern from `/automations/new`.
- New: [app/api/onboarding/zernio-key/route.ts](../app/api/onboarding/zernio-key/route.ts) — validates key against Zernio, returns profile + IG account lists.
- New: [app/api/onboarding/complete/route.ts](../app/api/onboarding/complete/route.ts) — encrypts key, upserts `profiles`, sets `onboarded_at = now()`.
- Middleware redirect: signed-in user with `onboarded_at IS NULL` → `/onboarding` (except `/api/me`, `/api/onboarding/*`, `/api/profiles/init`, `/auth/*`).
- **Deferred:** the tab-rework of `/settings` (Integrations / Email Collect / Account). Current settings page still works for credential management; the rework is cosmetic and can land later if needed.

**Phase 5 (code only) — Webhook tenant routing + multi-tenant poller**
- [app/api/webhook/route.ts](../app/api/webhook/route.ts) — `resolveTenant(payload)` looks up `profiles.zernio_account_id` against three candidate fields (`payload.account.id`, `payload.message.accountId`, `payload.conversation.accountId`). Bails silently on no-match (no leakage). Email-collect path scoped per user. `markProcessed` now writes `last_processed_msg_id` for proper dedup.
- [app/api/poller/route.ts](../app/api/poller/route.ts) — fan-out over users with email-collect configs. Each user gets a fresh Zernio client built from decrypted creds. Same `POLLER_SECRET` gate.
- **Manual Railway config still pending:** Nixpacks deploy, env vars in dashboard, cron service hitting `/api/poller` with the secret header, Zernio webhook URL → `https://<railway-domain>/api/webhook`.

**Smoke:**
- `npx tsc --noEmit` clean.
- Dev server boots, middleware compiles.
- Pre-Supabase mode: `/`, `/login`, `/signup`, `/onboarding`, `/api/me` → 200. Data routes (`/api/automations`, `/api/reels`, `/api/email-collect`, `/api/credentials`, `/api/onboarding/*`, `/api/poller`) → 500 with the expected "Your project's URL and Key are required to create a Supabase client" message. Will become 401 (no session) or 200 (signed in) once `.env` is filled.

**Pending:** end-to-end test against a real Supabase + Railway deployment. User to provision Supabase, paste env vars, push to Railway, set Zernio webhook URL, add Railway cron.

## 2026-05-20 — Phase 2 of multi-tenant rebuild ✅

Supabase Auth wired end-to-end. Not runtime-tested against live Supabase (user provisioning pending), but all routes 200 in pre-Supabase mode (graceful fallback when env vars empty).

**New files:**
- [lib/supabase/server.ts](../lib/supabase/server.ts) — `createSupabaseServerClient()` for Route Handlers + Server Components.
- [lib/supabase/middleware.ts](../lib/supabase/middleware.ts) — `updateSession()` with pre-Supabase pass-through.
- [lib/supabase/admin.ts](../lib/supabase/admin.ts) — service-role client (`getSupabaseAdmin()`).
- [lib/supabase/client.ts](../lib/supabase/client.ts) — `createSupabaseBrowserClient()` for login/signup forms.
- [lib/auth-helpers.ts](../lib/auth-helpers.ts) — `requireUser()` (throws `UnauthorizedError`), `getCurrentUser()`, `getProfile(userId)`.
- [middleware.ts](../middleware.ts) — Next.js middleware delegating to `updateSession`. Matcher excludes `_next/*`, image assets, `/api/webhook`.
- [app/(auth)/layout.tsx](../app/(auth)/layout.tsx) — centered logo layout for pre-auth pages.
- [app/(auth)/login/page.tsx](../app/(auth)/login/page.tsx) — email/password sign-in, supports `?next=` redirect.
- [app/(auth)/signup/page.tsx](../app/(auth)/signup/page.tsx) — email/password signup → `/api/profiles/init` → redirect `/onboarding`.
- [app/auth/callback/route.ts](../app/auth/callback/route.ts) — Supabase email-confirmation + OAuth callback handler.
- [app/api/me/route.ts](../app/api/me/route.ts) — current user + profile JSON.
- [app/api/profiles/init/route.ts](../app/api/profiles/init/route.ts) — idempotent insert of `profiles` row after signup.
- [components/DashboardChrome.tsx](../components/DashboardChrome.tsx) — conditionally renders Sidebar + status bar; hides on `/login`, `/signup`, `/auth/*`.

**Modified:**
- [components/Sidebar.tsx](../components/Sidebar.tsx) — reads IG handle / signed-in email from `/api/me`, adds Sign Out.
- [components/CredentialsBanner.tsx](../components/CredentialsBanner.tsx) — reads `/api/me`, only shows when authenticated and no Zernio key; nudges to `/onboarding`.
- [app/layout.tsx](../app/layout.tsx) — slimmed to html/body/fonts; chrome moved into `DashboardChrome`. Status bar IG handle now reads from `/api/me` not env.
- [.env.example](../.env.example) + [.env](../.env) — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (renamed from non-prefixed forms so browser client can read them).

**Smoke:**
- `npx tsc --noEmit` clean.
- Dev server boots, middleware compiles.
- `GET /` → 200, `GET /api/credentials` → 200, `GET /api/me` → 200 (returns `{user:null}` in pre-Supabase mode), `GET /login` → 200.
- Pre-Supabase fallback verified: middleware skips auth gating, `/api/me` returns null user gracefully.

**Pending:** end-to-end test against a real Supabase project (signup → confirm email → login → /api/me returns user + profile).

## 2026-05-20 — Phase 1 of multi-tenant rebuild ✅

DB + crypto foundation. Schema + migrations ready; user can paste the generated SQL into Supabase whenever they provision the project.

- Deps: `drizzle-orm@^0.45`, `drizzle-kit@^0.31`, `postgres@^3.4`, `@supabase/supabase-js@^2.106`, `@supabase/ssr@^0.10`.
- New: [lib/crypto.ts](../lib/crypto.ts) — AES-256-GCM `encrypt` / `decrypt`. Lazy key load (throws on first use if `ENCRYPTION_KEY` missing) — keeps dev server boot working without the env var. Round-trip smoke passed.
- New: [lib/db/schema.ts](../lib/db/schema.ts) — Drizzle schema for `profiles`, `email_collect_configs`, `processed_conversations`. Shadow `auth.users` declaration for type-safe FKs.
- New: [lib/db/index.ts](../lib/db/index.ts) — Drizzle client singleton over `postgres-js` with `prepare: false` for pgbouncer compat.
- New: [drizzle.config.ts](../drizzle.config.ts) — `schemaFilter: ['public']` so drizzle-kit doesn't try to manage Supabase's `auth` schema.
- New: [drizzle/0000_rich_frightful_four.sql](../drizzle/0000_rich_frightful_four.sql) — generated migration. `auth.users` CREATE wrapped in `IF NOT EXISTS` since Supabase owns that table; safe to apply against any Postgres.
- Modified: [.env.example](../.env.example) — placeholders for `DATABASE_URL`, `SUPABASE_*`, `ENCRYPTION_KEY`, `POLLER_SECRET`. Also created `.env.example` fresh since the file had been deleted.
- Modified: [.env](../.env) — empty placeholders for the new vars.
- Modified: [package.json](../package.json) — scripts `db:generate`, `db:push`, `db:migrate`.

**Smoke:**
- `npx tsc --noEmit` clean.
- `npm run db:generate` produced the migration.
- One-shot crypto round-trip via `node --experimental-strip-types` works (`ENCRYPTION_KEY=$(openssl rand -hex 32)` … encrypt → decrypt → ✓).
- Dev server reboots cleanly; existing single-tenant flows unaffected.

**Pending:** user provisions Supabase, fills in env, runs `npm run db:migrate` (or pastes the SQL into Supabase SQL editor).

## 2026-05-20 — Phase 0 of multi-tenant rebuild ✅

Stack pivot from Vercel/Auth.js to **Supabase (DB + Auth) + Railway**. Docs-only changes:

- Rewrote [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) with revised architecture-decisions table, new data model (`profiles` instead of `users`), and Phase 1–5 blocks reflecting the new stack.
- Rewrote [db-schema.md](db-schema.md) — `users` → `profiles` (FK to `auth.users`), dropped `ai_contexts` + `ai_message_log`.
- Updated [../CLAUDE.md](../CLAUDE.md) Stack table + Current State.
- Bumped [session-handoff.md](session-handoff.md) with the pivot TL;DR.

**Smoke:** N/A (docs only). No code touched.

## 2026-05-18 — Workflow scaffolding bootstrap

- Created [CLAUDE.md](../CLAUDE.md), [AGENTS.md](../AGENTS.md), and `.claude/` companion files per [.claude/WORKFLOW.md](WORKFLOW.md).
- Moved `WORKFLOW.md` from repo root → `.claude/WORKFLOW.md`.
- Folded `projectUpgrade.md` → [.claude/Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) with phase status markers.

## 2026-05-18 — Credentials store refactor

- New: [lib/credentials-store.ts](../lib/credentials-store.ts) — 3-tier KV/Gist/file persistence with env fallback.
- New: [app/api/credentials/route.ts](../app/api/credentials/route.ts) — GET status / POST validate+save / DELETE clear.
- New: [components/CredentialsBanner.tsx](../components/CredentialsBanner.tsx) — amber banner when unconfigured.
- Modified: [lib/zernio.ts](../lib/zernio.ts) — async `getZernio()` / `getProfileId()` / `getAccountId()` / `hasCredentials()`.
- Modified: all 6 API routes (`automations`, `automations/[id]`, `analytics`, `reels`, `poller`, `webhook`) — await async getters, return `needsCredentials: true` on 401.
- Modified: [app/settings/page.tsx](../app/settings/page.tsx) — added "Zernio API Credentials" card with connect/disconnect flow.
- **Smoke**: `/api/credentials` returns `{ configured: true, source: "env" }` locally; `/api/automations` still returns full list.

## 2026-05-18 — UX polish: account-wide automations + DM-preview newlines + ChatHQ rebrand

- [app/automations/new/page.tsx](../app/automations/new/page.tsx) — "All Posts (Account-Wide)" option in step 0, omits `platformPostId` in launch payload.
- DM preview boxes now use `whitespace-pre-wrap break-words` so paragraphs render correctly.
- Renamed "Zernio" / "Automation OS" branding to **ChatHQ** in [components/Sidebar.tsx](../components/Sidebar.tsx) and [app/layout.tsx](../app/layout.tsx).

---

## Phase status (multi-tenant rebuild)

See [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) for the canonical phase tracker. Summary:

| Phase | Status |
|---|---|
| 1 — DB + crypto foundation | ⏳ Not started |
| 2 — Auth (signup, login, middleware) | ⏳ Not started |
| 3 — Per-user Zernio refactor | ⏳ Not started |
| 4 — Onboarding wizard + Settings rebuild | ⏳ Not started |
| 5 — Webhook tenant routing + multi-tenant poller | ⏳ Not started |
| 6 — AI Knowledge Base page | ⏳ Not started |
| 7 — Gemini auto-reply agent | ⏳ Not started |
| 8 — Migration script for self-hosted users | ⏳ Not started |
