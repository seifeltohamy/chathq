# Audit Checklist — Sensitive Changes

> Deeper review for security-sensitive surfaces. Run when touching: auth, encryption, credential storage, webhooks, file uploads, AI agent prompts, RBAC.

## Credentials & encryption

- [ ] Are raw API keys ever logged? Grep for `console.log` near `apiKey`, `process.env.ZERNIO_API_KEY`, `userZernioKey`.
- [ ] Is `ENCRYPTION_KEY` validated at boot? A weak/missing key should fail fast, not silently produce garbage ciphertext.
- [ ] Is the AES-256-GCM nonce random per encrypt? Reuse breaks confidentiality.
- [ ] Are encrypted fields in DB never exposed via API? Check `/api/me` and any user-listing endpoint.

## Auth (post-Phase 2)

- [ ] Middleware excludes only the routes that must be public (`/api/webhook`, `/api/auth/*`, `/login`, `/signup`, static assets). Be explicit — don't whitelist `/api/.*`.
- [ ] JWT secret rotation plan: documented?
- [ ] Signup rate limit?
- [ ] Password hashing uses bcrypt with cost ≥ 10.
- [ ] `/api/auth/signup` validates email format + password length server-side; do not trust client.

## Webhook (post-Phase 5)

- [ ] Tenant routing: `payload.account.id` lookup against `users.zernio_account_id`. If lookup fails, **bail silently** — don't echo back which IDs are valid.
- [ ] No tenant ID leakage in error responses to the webhook caller.
- [ ] Replay protection: `last_processed_msg_id` check. If Zernio's message IDs are not monotonic, add timestamp guard.
- [ ] Self-reply guard: never reply when sender's IG ID equals the tenant's own.
- [ ] Webhook is unauthenticated (by design — Zernio doesn't sign payloads at this tier). Document the tradeoff.

## AI agent (post-Phase 7)

- [ ] System prompt: never echoes raw user fields without sanitisation (prompt injection from `business_info`).
- [ ] User-supplied prompt content runs through a length cap.
- [ ] Token budget: hard cap on `maxOutputTokens` (400). No unbounded streaming.
- [ ] Failure mode: silent (`status='failed'` in `ai_message_log`). No fallback message — silence beats wrong.
- [ ] Per-user rate limit (30/min) enforced via `ai_message_log` count.
- [ ] Conversation lifetime cap (~50 replies) — prevents pathological loops.
- [ ] Cost attribution: `tokens_in/out` logged per call.

## RBAC

When/if admin features land:
- [ ] Server-side `requireUser()` + role check, never trust client.
- [ ] All `userId` query params come from the session, never from the URL.

## Documentation

- [ ] New env vars added to `.env.example` AND [api-contract.md](api-contract.md) AND `[CLAUDE.md](../CLAUDE.md)` if load-bearing.
- [ ] New tables documented in [db-schema.md](db-schema.md).
- [ ] Security tradeoffs called out in the relevant Planning/<feature>.md `Open questions` block.
