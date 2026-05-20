# API Contract — Living Spec

> Every HTTP route the app exposes. Update on every change.

## Conventions

- All routes are Next.js App Router route handlers under `app/api/<name>/route.ts`.
- All routes that hit Zernio wrap `getZernio()` / `getProfileId()` / `getAccountId()` in try/catch and return `{ error, needsCredentials: true }` with status 401 when credentials aren't configured.
- All bodies are JSON (`Content-Type: application/json`).

## Routes

### `GET /api/credentials`

Returns the configured Zernio credentials state — used by the settings card and the [CredentialsBanner](../components/CredentialsBanner.tsx).

**200 response:**
```json
{
  "configured": true,
  "apiKeyMasked": "sk_xxx…yyyy",
  "profileId": "6a0b…2735",
  "accountId": "6a0b…15f1",
  "igUsername": "@username",
  "source": "env" | "store" | null,
  "storage": "kv" | "gist" | "file"
}
```

### `POST /api/credentials`

Body: `{ apiKey: "sk_..." }`. Validates against Zernio, derives profile+account IDs, persists.

**200**: `{ success, profileId, accountId, igUsername, profileName }`
**400**: `{ error }` — invalid format, no profile, no IG account connected
**401**: `{ error }` — Zernio rejected the key

### `DELETE /api/credentials`

Clears persisted credentials (env fallback still applies after).

---

### `GET /api/automations`

Lists comment-automations for the current profile.
**200**: `{ success, automations: [...] }` per Zernio's `listCommentAutomations`.

### `POST /api/automations`

Body matches Zernio's `CreateCommentAutomationData.body` shape, **except** `profileId` and `accountId` are filled in by the server. Omit `platformPostId` for account-wide automations.

### `GET /api/automations/[id]`

Get single automation + its trigger logs.

### `PATCH /api/automations/[id]`

Update mutable fields (e.g. `isActive: true|false`).

### `DELETE /api/automations/[id]`

Delete automation.

---

### `GET /api/reels`

Lists recent inbox comments / reels for the connected IG account (limit 25).

### `GET /api/analytics`

Returns aggregated overview, daily/hourly stats, leaderboard, keyword breakdown, recent logs (last 14 days). All client-side computation lives here.

---

### `GET /api/email-collect`

Returns saved per-automation email-collect configs + active `storageMode` (`kv | gist | file`).

### `POST /api/email-collect`

Body: `EmailCollectConfig` (see [lib/email-collect-store.ts](../lib/email-collect-store.ts)). Upsert.

### `DELETE /api/email-collect/[id]`

Delete a per-automation email-collect config by `automationId`.

---

### `GET /api/poller`

Cron-style polling for the email-collect follow-up. In production requires header `x-poller-secret: $POLLER_SECRET` if `POLLER_SECRET` is set.

### `POST /api/webhook`

Zernio's webhook destination for `message.received` events. Public (no auth). Detects email in incoming text, matches to email-collect config, sends follow-up DM + Brevo email.

---

## Future routes (multi-tenant rebuild)

Tracked in [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md). Listed here so they aren't duplicated by accident:

- `POST /api/auth/signup` — public
- `* /api/auth/[...nextauth]` — public
- `GET /api/me` — auth required
- `POST /api/onboarding/zernio-key` — auth required
- `POST /api/onboarding/complete` — auth required
- `GET|POST /api/knowledge` — auth required
