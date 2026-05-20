# AGENTS.md — ChatHQ Codebase Guide

## Project Overview

Next.js 15 Instagram automation dashboard. Users connect their IG account via the Zernio API, then build comment→DM automations, multi-step DM sequences, and view trigger analytics. Currently single-tenant (one IG per deploy); multi-tenant SaaS rebuild in progress under [.claude/Planning/multi-tenant-ai.md](.claude/Planning/multi-tenant-ai.md).

## Build / Run / Test Commands

### Dev server

```bash
# First time
npm install
cp .env.example .env                 # then paste your Zernio API key

# Daily dev
npm run dev                          # http://localhost:3000, Turbopack
```

If running locally without `.env`, the app still starts but every API route returns 401 until you visit `/settings` and paste a key. The amber banner at the top of every page reminds you.

### One-off CLI utilities (read `.env`)

```bash
npm run list                         # print Zernio profile + IG account IDs
npm run create                       # create one automation from .env values
```

### Production

```bash
npm run build                        # next build
npm start                            # next start
```

### Manual smoke (no test framework yet)

```bash
# Confirm credentials wiring
curl -s http://localhost:3000/api/credentials | jq

# Confirm Zernio reach
curl -s http://localhost:3000/api/automations | jq '.automations | length'
curl -s http://localhost:3000/api/reels | jq '.data | length'
```

### TypeScript

```bash
npx tsc --noEmit                     # full typecheck (no test runner yet)
```

## Common Workflows

### "I want to add a new API endpoint"

1. Add route at `app/api/<name>/route.ts`. Use `await getZernio()` + `await getProfileId()` / `await getAccountId()` from [lib/zernio.ts](lib/zernio.ts).
2. Always wrap credential lookups in `try/catch` and return `{ error, needsCredentials: true }` with status 401 on failure — the [CredentialsBanner](components/CredentialsBanner.tsx) reacts to this.
3. Document the new endpoint in [.claude/api-contract.md](.claude/api-contract.md).
4. Test with `curl localhost:3000/api/<name>`.

### "I want to add credentials/secrets to the deploy"

- **Single-tenant (today)**: User pastes their Zernio key into `/settings`. The 3-tier store ([lib/credentials-store.ts](lib/credentials-store.ts)) auto-picks KV → Gist → file → env. For Vercel: provision **Upstash Redis** from the Vercel marketplace (replaces the deprecated Vercel KV) — `KV_REST_API_URL` + `KV_REST_API_TOKEN` get auto-injected.
- **Multi-tenant (post-Phase 1)**: Per-user creds stored AES-256-GCM encrypted in Postgres via [lib/crypto.ts](lib/crypto.ts) (TBD). `ENCRYPTION_KEY` env required.
- Never log raw API keys.

### "I want to change what happens when a comment fires an automation"

The trigger logic lives in Zernio's backend — we only configure it via [`POST /api/automations`](app/api/automations/route.ts) which proxies to `z.commentautomations.createCommentAutomation`. The shape of the payload is constrained by `CreateCommentAutomationData` in `node_modules/@zernio/node/dist/index.d.ts`.

### "I want to change what happens when someone replies with an email"

That's the **email-collect flow**. Two paths:
1. [`POST /api/webhook`](app/api/webhook/route.ts) — Zernio fires this on incoming DMs. Looks up matching config in [lib/email-collect-store.ts](lib/email-collect-store.ts), sends follow-up DM + Brevo email.
2. [`GET /api/poller`](app/api/poller/route.ts) — fallback poll over the inbox if webhook misses fire.

### "I want to deploy a new branding/copy change"

For top-bar/sidebar branding, edit [components/Sidebar.tsx](components/Sidebar.tsx) and [app/layout.tsx](app/layout.tsx). Browser tab title is in `app/layout.tsx`'s `metadata.title`.

### "I want to start a new feature in the multi-tenant rebuild"

1. Open [.claude/Planning/multi-tenant-ai.md](.claude/Planning/multi-tenant-ai.md).
2. Pick the next ⏳ phase.
3. Enter plan mode if you haven't already (architecture choice = plan-mode trigger).
4. Implement; bump phase status to ✅ Shipped YYYY-MM-DD on completion.
5. Update test counts / next-task pointer in [CLAUDE.md](CLAUDE.md) Current State section.
6. Add a TL;DR entry to [.claude/session-handoff.md](.claude/session-handoff.md).

## Codebase map

```
manychat-killer-main/
├── app/                              # Next.js App Router
│   ├── api/                          # Route handlers
│   │   ├── automations/              # GET/POST automations, GET/PATCH/DELETE [id]
│   │   ├── credentials/              # GET status / POST save / DELETE clear  ← session-added
│   │   ├── reels/                    # GET inbox-comment-posts list
│   │   ├── analytics/                # GET overview + daily + leaderboard
│   │   ├── email-collect/            # GET/POST/DELETE per-automation configs
│   │   ├── poller/                   # GET poll inbox for email-collect replies
│   │   └── webhook/                  # POST Zernio webhook entry
│   ├── automations/                  # /automations + /automations/new
│   ├── sequences/                    # multi-step DM drips
│   ├── analytics/                    # dashboard
│   └── settings/                     # credentials card + per-automation email-collect setup
├── components/                       # Sidebar, CredentialsBanner
├── lib/
│   ├── zernio.ts                     # async Zernio client + ID getters
│   ├── credentials-store.ts          # 3-tier credential persistence  ← session-added
│   ├── email-collect-store.ts        # 3-tier email-collect persistence
│   └── email-sender.ts               # Brevo wrapper
├── scripts/                          # CLI utilities (read .env, not multi-tenant)
└── zernio-api-documentation/         # Vendored Zernio API docs (large file)
```

## Pre-commit (3-minute checklist)

See [.claude/pre-commit.md](.claude/pre-commit.md). Highlights:

1. `npx tsc --noEmit` clean.
2. Dev server reloads cleanly (no console errors on the Network tab).
3. `grep -rn "sk_[a-f0-9]" .` returns nothing — no leaked API keys.
4. `.env` not staged (`.gitignore` has it).
5. CLAUDE.md Current State block + session-handoff TL;DR updated.
