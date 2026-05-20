# Next Passes

> Scaffolding + docs that aren't blocking anything today but should land at the right phase. Each entry lists when it becomes worth creating.

## `session-archive.md`

**What:** Older `session-handoff.md` entries when handoff gets long.
**When:** When [session-handoff.md](session-handoff.md) starts pushing past ~80 lines. Right now it has one entry; nothing to archive yet.
**How:** Cut the oldest blocks from `session-handoff.md`, paste into `session-archive.md`, keep `session-handoff.md` to the latest 1–2 blocks.

## `auth-plan.md`

**What:** Auth-specific architecture doc — Auth.js v5 setup, JWT strategy, session shape, middleware matcher, signup rate limiting, password hashing cost.
**When:** Start writing it as Phase 2 of [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) implementation begins. Pattern crystallises during implementation, not before — most of it can be derived from [auth.ts](../auth.ts) once it exists.
**Skeleton:**
- Why JWT not DB sessions (webhook/poller hit rate)
- Credentials provider config
- `requireUser()` / `getCurrentUser()` helper contract
- Middleware matcher: what's public vs gated
- Signup hardening (rate limit, email regex, bcrypt cost)
- Session shape (what fields are in the JWT)

## `field-encryption.md`

**What:** AES-256-GCM encrypted-field pattern for sensitive columns (`zernio_api_key_enc`, `brevo_api_key_enc`).
**When:** When [lib/crypto.ts](../lib/crypto.ts) gets written in Phase 1 of [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md).
**Skeleton:**
- `encrypt(plaintext) → string` / `decrypt(ciphertext) → string` contract
- Nonce strategy (12-byte random per encrypt, prepended to ciphertext)
- Key derivation: `ENCRYPTION_KEY` is 32-byte hex, parsed once at module load
- Boot-time validation (key length, fail fast if missing)
- Test vector for round-trip
- Rotation playbook (no automation; manual re-encrypt + key swap)

## `audit-log-guide.md` — SKIP

**What:** AuditLog model + AuditMixin pattern.
**Why skipping:** Django/DRF convention from the reference project that doesn't map onto Next.js + Drizzle. No audit-log table planned in [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md). If we ever want one, revisit then — but it's a feature, not scaffolding.

## CLI / tooling not yet wired

- **Code review agent** — [.claude/pre-commit.md](pre-commit.md) and [WORKFLOW.md](WORKFLOW.md) §5 reference a `code-reviewer` subagent for ≥3-file changes. Not yet set up in this repo's `.claude/agents/`.
- **Test framework** — no test runner. Smoke is curl-driven. When Phase 1 lands, decide whether to add Vitest (frontend-friendly) or Jest, and add `npm test` to [pre-commit.md](pre-commit.md).
