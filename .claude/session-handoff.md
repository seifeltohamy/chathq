# Session Handoff

> TL;DR of the most recent work block. When this gets long, push the older entries to `session-archive.md`.

## 2026-05-20 (latest)

**Stack pivot — Supabase + Railway**

- Multi-tenant rebuild stack changed from Vercel Postgres + Auth.js v5 + Vercel hosting → **Supabase (DB + Auth) + Railway**.
- ORM stays Drizzle (`drizzle-orm/postgres-js`).
- Auth becomes Supabase Auth via `@supabase/ssr`. `auth.users` is Supabase-managed; we extend with `profiles` (FK→`auth.users.id`). No bcrypt, no NextAuth glue.
- Cron strategy: Railway native cron hitting `/api/poller` every 5 min with `POLLER_SECRET` header.
- All planning docs rewritten: [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md), [db-schema.md](db-schema.md), [../CLAUDE.md](../CLAUDE.md), [checklist.md](checklist.md). New plan is phased 0 → 5; AI agent (was 6–7) stays out of scope.
- Plan file at [`/Users/seifeltohamy/.claude/plans/we-ll-work-on-users-seifeltohamy-desktop-dazzling-phoenix.md`](../../../../.claude/plans/we-ll-work-on-users-seifeltohamy-desktop-dazzling-phoenix.md).

**Open follow-ups:**
- Phase 1 still blocked on user provisioning Supabase + sharing `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`.
- Railway connection not yet made — only needed when Phase 5 deploys.

---

## 2026-05-18

**Where the code is right now:**
- Dev server runs on `localhost:3000`, branded "ChatHQ".
- Credentials wiring refactored — `.env` still works but the canonical path is /settings UI → KV/Gist/file.
- All API routes return `needsCredentials: true` (401) when creds are missing; a yellow banner at the top of every page nudges to /settings.
- Project scaffolding ([CLAUDE.md](../CLAUDE.md), [AGENTS.md](../AGENTS.md), `.claude/*`) just landed.
- [.claude/Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) is the canonical plan for the 8-phase SaaS rebuild.

**What was shipped this block:**
1. Account-wide automation option in the new-automation wizard.
2. DM preview newline fix (`whitespace-pre-wrap`).
3. Rebrand: Zernio → ChatHQ in sidebar / status bar / page title.
4. Credentials store refactor (KV/Gist/file/env-fallback) + /api/credentials endpoint + /settings UI + top-of-page banner.
5. Workflow scaffolding: CLAUDE.md, AGENTS.md, .claude/* companions, projectUpgrade.md → Planning/multi-tenant-ai.md.

**Scope decision (this session):**
- Multi-tenant rebuild scope **narrowed from 8 phases to 1–5**. Phases 6–7 (AI Knowledge Base + Gemini agent) explicitly deferred out of scope. Phase 8 (migration script) only matters if existing self-hosted users need upgrading.
- Phase 1 **paused** — user wants to provision Postgres first, then return.

**Open follow-ups for next session:**
- **Phase 1 ON HOLD** — when user has `POSTGRES_URL`, resume from [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md). User will generate `AUTH_SECRET` and `ENCRYPTION_KEY` themselves. `GEMINI_API_KEY` no longer needed (Phase 7 out of scope).
- Sidebar IG-handle (`process.env.NEXT_PUBLIC_IG_USERNAME` in [components/Sidebar.tsx:71](../components/Sidebar.tsx#L71)) should read from credentials store post-connect — deferred since Phase 4 will replace it anyway.
- `@vercel/kv` shows a deprecation warning on install (Vercel moved to Upstash Redis); the credentials store handles both since `@vercel/kv` reads `KV_REST_API_URL` regardless of provider. No action needed unless tier 1 fails in prod.
- Three scaffolding docs are deliberately not created yet — tracked in [.claude/nextpasses.md](nextpasses.md) with "when to create" triggers.

**Test counts:** No automated tests yet. Smoke flow: `npx tsc --noEmit` + curl `/api/credentials` / `/api/automations` / `/api/reels`.
