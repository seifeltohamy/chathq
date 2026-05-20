# DB Schema — Living Spec

> Postgres tables for the multi-tenant rebuild on Supabase. **Empty until Phase 1 ships.**

Current state: no app-managed DB. Storage is in KV / Gist / local file (see [credentials-store.ts](../lib/credentials-store.ts), [email-collect-store.ts](../lib/email-collect-store.ts)).

After Phase 1 lands: Supabase Postgres + Drizzle ORM. `auth.users` is Supabase-managed (email, password, sessions). Our tables extend it.

## Planned tables (Phase 1 — [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md))

### `public.profiles`

Extension of Supabase's `auth.users` — holds Zernio + Brevo creds and onboarding state.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (PK, FK→`auth.users(id)` ON DELETE CASCADE) | One row per user |
| `ig_username` | `text` | Derived from Zernio on onboarding |
| `zernio_api_key_enc` | `text` | AES-256-GCM via [lib/crypto.ts](../lib/crypto.ts) |
| `zernio_profile_id` | `text` | — |
| `zernio_account_id` | `text` (unique) | Webhook tenant routing key |
| `brevo_api_key_enc` | `text` (nullable) | AES-256-GCM |
| `brevo_from_email` | `text` (nullable) | — |
| `onboarded_at` | `timestamptz` (nullable) | null = redirect to /onboarding |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

### `public.email_collect_configs`

Replaces the KV/Gist/file tier in [lib/email-collect-store.ts](../lib/email-collect-store.ts).

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (FK→`auth.users(id)` ON DELETE CASCADE) | Part of composite PK |
| `automation_id` | `text` | Part of composite PK |
| `automation_name` | `text` | — |
| `email_ask_text` | `text` | — |
| `follow_up_dm` | `text` | — |
| `email_subject` | `text` | — |
| `updated_at` | `timestamptz` | default `now()` |

### `public.processed_conversations`

Replaces in-memory `Set` in [lib/email-collect-store.ts](../lib/email-collect-store.ts). Also gates the per-convo 30s throttle and the dedup guard.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (FK→`auth.users(id)` ON DELETE CASCADE) | Composite PK |
| `conversation_id` | `text` | Composite PK |
| `last_processed_msg_id` | `text` (nullable) | Dedup guard |
| `last_replied_at` | `timestamptz` (nullable) | Throttle gate |

## Out of scope

`ai_contexts` and `ai_message_log` (AI Knowledge Base + Gemini agent) — not modelled. See [Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md) Phases 6–7 (out of scope).

## Migrations

Managed by `drizzle-kit` once Phase 1 ships. Migration SQL lives in `drizzle/` and is applied via Supabase SQL Editor (paste) or `db:migrate` (requires `DATABASE_URL`).
