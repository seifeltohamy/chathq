# ChatHQ — Claude Code Project Brief

> Auto-loaded at session start. Read this first. For details, see `.claude/` files.

## What This App Does

Self-hosted Instagram automation dashboard (formerly "ManyChat Killer", branded **ChatHQ**) built on the Zernio API. Users connect their IG via Zernio, then create comment→DM automations: someone comments a keyword on a reel, they instantly get a DM. Multi-step DM drip sequences, optional "ask for email first → email collect" flow, and trigger log analytics round it out.

Currently single-tenant (one IG account via `.env` or the `/settings` UI) — the in-flight upgrade ([.claude/Planning/multi-tenant-ai.md](.claude/Planning/multi-tenant-ai.md)) turns it into a multi-tenant SaaS on **Supabase + Railway** with auth + per-user Postgres-backed creds. AI agent (originally Phase 7) explicitly out of scope.

## Stack

| Layer    | Technology                                  | Port |
|----------|---------------------------------------------|------|
| Frontend | Next.js 15 (App Router, Turbopack) + React 19 + TypeScript | 3000 |
| Backend  | Next.js Route Handlers (Node runtime)       | 3000 |
| Styling  | Tailwind CSS v3 (custom dark theme)         | —    |
| External | Zernio API (`@zernio/node`)                 | —    |
| Storage (today) | 3-tier KV → GitHub Gist → local file ([lib/credentials-store.ts](lib/credentials-store.ts), [lib/email-collect-store.ts](lib/email-collect-store.ts)) | — |
| Storage (post-Phase 1) | Supabase Postgres + Drizzle ORM | —    |
| Auth (post-Phase 2) | Supabase Auth via `@supabase/ssr` | —    |
| Hosting | Railway (Nixpacks; native cron for poller)  | —    |
| Email   | Brevo (transactional API, [lib/email-sender.ts](lib/email-sender.ts)) | — |

## How to Run

```bash
# Install deps
npm install

# Local dev (Turbopack)
npm run dev                                    # → http://localhost:3000

# List your Zernio profile + IG account IDs (uses .env)
npm run list

# Create a single automation from .env values
npm run create

# Production build
npm run build && npm start
```

For Vercel deploys, the user pastes their Zernio API key into `/settings` (no env vars required if Vercel KV is provisioned).

## Where to Look for Details

| Topic                          | File                                  |
|--------------------------------|---------------------------------------|
| Multi-tenant SaaS upgrade plan | `.claude/Planning/multi-tenant-ai.md` |
| Workflow convention            | `.claude/WORKFLOW.md`                 |
| Per-endpoint API spec          | `.claude/api-contract.md`             |
| DB tables (post-Phase 1)       | `.claude/db-schema.md`                |
| Code conventions               | `.claude/patterns.md`                 |
| Per-feature shipping log       | `.claude/checklist.md`                |
| Most-recent session TL;DR      | `.claude/session-handoff.md`          |
| Pre-commit checklist           | `.claude/pre-commit.md`               |

## Critical Patterns

- **Credentials**: Read via `requireCredentials()` / `getCredentials()` from [lib/credentials-store.ts](lib/credentials-store.ts) — never `process.env.ZERNIO_API_KEY` directly in route code. The store handles the env→KV→Gist→file fallback chain.
- **Zernio client**: Always `await getZernio()` per request in [lib/zernio.ts](lib/zernio.ts). Do not cache a global Zernio client (the singleton was removed in the credentials refactor so multi-tenant Phase 3 can drop in).
- **All API routes wrap getZernio/credential lookups in try/catch and return `{ error, needsCredentials: true }` with status 401** when credentials are missing — the frontend [components/CredentialsBanner.tsx](components/CredentialsBanner.tsx) reacts to this.
- **Tailwind tokens** in [tailwind.config.mjs](tailwind.config.mjs) — never hardcode hex. Palette: `bg`, `surface`, `raised`, `border`, `ink`, `prose`, `note`, `green`, `green-lo`, `amber`, `danger`, `blue`.
- **Page chrome**: `<div className="p-10 max-w-3xl">` + mono eyebrow + `h1.text-3xl font-semibold tracking-tight`. See [app/settings/page.tsx](app/settings/page.tsx) for the canonical pattern.

## Anti-Patterns — Never Do These

- Don't import `PROFILE_ID` / `ACCOUNT_ID` as constants from `lib/zernio.ts` — those were removed; use the async getters.
- Don't write code that assumes a single tenant once Phase 2 (auth) ships. Always thread `userId`.
- Don't create a global Zernio client cached across requests — Phase 3 needs per-user clients.
- Don't bypass [lib/credentials-store.ts](lib/credentials-store.ts) by reading env vars directly in routes — breaks the UI-config flow.
- Don't add new `commentReply` / `dmMessage` fields without checking the Zernio SDK's `CreateCommentAutomationData` type — the API constrains shape.

## Key File Paths

| File | Purpose |
|------|---------|
| [lib/zernio.ts](lib/zernio.ts) | Async Zernio client + ID getters; thin wrapper over credentials-store |
| [lib/credentials-store.ts](lib/credentials-store.ts) | 3-tier credential storage (KV/Gist/file) + env fallback |
| [lib/email-collect-store.ts](lib/email-collect-store.ts) | 3-tier email-collect config storage (same pattern) |
| [lib/email-sender.ts](lib/email-sender.ts) | Brevo transactional email send |
| [app/api/credentials/route.ts](app/api/credentials/route.ts) | GET status, POST validate+save, DELETE disconnect |
| [app/api/webhook/route.ts](app/api/webhook/route.ts) | Zernio webhook handler (email-collect path today; AI path lands Phase 5+7) |
| [app/api/poller/route.ts](app/api/poller/route.ts) | Cron-style polling fallback for the webhook |
| [app/automations/new/page.tsx](app/automations/new/page.tsx) | 4-step automation builder (scope, trigger, response, launch) |
| [components/Sidebar.tsx](components/Sidebar.tsx) | Sidebar nav — branded "ChatHQ" |
| [components/CredentialsBanner.tsx](components/CredentialsBanner.tsx) | Top-of-page warning when no Zernio creds configured |

## Current State (2026-05-20)

Shipped today:
- **Phase 0 of multi-tenant rebuild** — pivoted stack from Vercel + Auth.js + Drizzle to **Supabase (DB + Auth) + Railway hosting**. All planning docs rewritten ([.claude/Planning/multi-tenant-ai.md](.claude/Planning/multi-tenant-ai.md), [.claude/db-schema.md](.claude/db-schema.md), this file, session-handoff, checklist).

Shipped previous session (2026-05-18):
- Workflow scaffolding ([.claude/WORKFLOW.md](.claude/WORKFLOW.md) plus all `.claude/` companions; CLAUDE.md + AGENTS.md at root).
- Credentials refactor — [lib/credentials-store.ts](lib/credentials-store.ts) with KV/Gist/file/env-fallback chain, [/api/credentials](app/api/credentials/route.ts), [/settings](app/settings/page.tsx) UI to paste+validate key, amber banner via [components/CredentialsBanner.tsx](components/CredentialsBanner.tsx). All 6 API routes use async `getZernio()` / `getProfileId()` / `getAccountId()`.
- Renamed branding "Zernio" / "Automation OS" → **ChatHQ**.
- Added "All Posts (Account-Wide)" option to new-automation flow.
- Fixed DM preview newline rendering (`whitespace-pre-wrap`).

Open follow-ups:
- Sidebar IG-handle display still reads `process.env.NEXT_PUBLIC_IG_USERNAME` — will be replaced by `/api/me` in Phase 2.
- **Phase 1 of multi-tenant rebuild not started.** Requires user to provision Supabase + provide `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`.

## Agent self-instructions

- **Explore agents by default** for features touching ≥ 3 files or uncertain scope.
- **Plan agent for non-trivial architecture choices** — every phase in Planning/multi-tenant-ai.md qualifies.
- **Smoke before declaring done**: server compiles cleanly, hit affected endpoints with curl, dev server restart after `.env` edits.
- **Save auto-memory aggressively** for non-obvious design moves (the env→store credentials migration is one such move).
- **Verify memory before recommending** — file paths and function names in memory may be stale.
