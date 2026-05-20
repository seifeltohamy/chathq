# Claude Code Workflow Setup — Reference Guide

> A portable reference for the project structure, planning convention, and
> session workflow this repo uses with Claude Code. Copy this file (and the
> relevant template chunks below) into a new project to bootstrap the same
> way of working.

---

## 1. File layout

```
<project-root>/
├── CLAUDE.md                       # ALWAYS auto-loaded at session start. Project brief + invariants.
├── AGENTS.md                       # CLI command reference (build / run / test recipes).
├── .claude/
│   ├── WORKFLOW.md                 # This file. Onboarding for new sessions / new projects.
│   ├── settings.json               # Permissions allow-list + scoped paths.
│   ├── settings.local.json         # Per-machine settings overlay (auto-managed).
│   ├── api-contract.md             # Living spec of every HTTP endpoint.
│   ├── db-schema.md                # Living spec of every DB table + column.
│   ├── checklist.md                # Per-feature shipping log (phases, statuses, test counts).
│   ├── session-handoff.md          # TL;DR of the most recent work block.
│   ├── session-archive.md          # Older session-handoff entries when handoff gets long.
│   ├── patterns.md                 # Code conventions (DRF, React, file-path style).
│   ├── pre-commit.md               # 3-minute pre-commit checklist.
│   ├── audit-checklist.md          # Deeper security review for sensitive changes.
│   ├── auth-plan.md                # Auth-specific architecture doc.
│   ├── field-encryption.md         # Encrypted-field pattern.
│   ├── audit-log-guide.md          # AuditLog model + AuditMixin usage.
│   └── Planning/
│       ├── <feature-a>.md          # SoT plan per feature, phased.
│       ├── <feature-b>.md
│       └── …
│
└── (memory lives outside the repo — see §3)
```

**Why two top-level files (CLAUDE.md + AGENTS.md)?** Distinct audiences:
- `CLAUDE.md` is the always-loaded *brief* — current state, where to look,
  invariants. Short, high-signal.
- `AGENTS.md` is the *command cookbook* — exact shell incantations for
  build / test / migrate / smoke. Long, low-signal-density.

---

## 2. `CLAUDE.md` template

Auto-loaded at every session start. **Keep this file < 200 lines** so it
doesn't dominate the context window. The template:

```markdown
# <Project Name> — Claude Code Project Brief

> Auto-loaded at session start. Read this first. For details, see `.claude/` files.

## What This App Does
<2-3 sentence elevator pitch. Mention user roles + the load-bearing domain
concept.>

## Stack

| Layer    | Technology                                | Port |
|----------|-------------------------------------------|------|
| Frontend | <e.g. Vite + React 19 + TS>               | …    |
| Backend  | <e.g. Django + DRF>                       | …    |
| AI/ML    | <if applicable>                           | …    |
| Database | <e.g. Supabase Postgres>                  | …    |
| Auth     | <e.g. Supabase Auth>                      | —    |
| Storage  | <e.g. local media (dev) / S3 (prod)>      | —    |

## How to Run
<code blocks for: backend, frontend, any microservices, migrations, tests,
typecheck. Same incantations as AGENTS.md but the most common 5 lifted.>

## Where to Look for Details

| Topic                          | File                                  |
|--------------------------------|---------------------------------------|
| Current state + next tasks     | `.claude/session-handoff.md`          |
| Feature progress               | `.claude/checklist.md`                |
| Code patterns                  | `.claude/patterns.md`                 |
| All API endpoints              | `.claude/api-contract.md`             |
| DB tables                      | `.claude/db-schema.md`                |
| Auth flow                      | `.claude/auth-plan.md`                |
| Pre-commit checklist           | `.claude/pre-commit.md`               |
| Per-feature plans (SoT)        | `.claude/Planning/<feature>.md`       |

## Critical Patterns

<code-block-illustrated invariants. Examples:>
- Backend: ALWAYS use env() for config, NEVER hardcode secrets.
- Backend: Never use fields = '__all__' in DRF serializers.
- Frontend: ALWAYS use apiRequest() for JSON calls.
- Always update <X type/enum/registry> when adding a new <Y>.

## Anti-Patterns — Never Do These

- One bullet per "this has bitten us before" mistake.
- Keep < 10 entries; pull older ones into patterns.md.

## Key File Paths

| File | Purpose |
|------|---------|
| <path> | <1-line role description> |
| …    | …    |

## Current State (YYYY-MM-DD)

<1-paragraph + bullet list of "what shipped this session" + open follow-ups.
Bump test counts here. Reference session-handoff for details.>

## Agent self-instructions

Rules I (Claude) follow each session, codified so I default to them:

- **Explore agents by default** for features touching ≥ 3 files or uncertain scope.
- **Code-reviewer agent before declaring done** when the change touches ≥ 3 files
  OR includes new modal/portal code OR new env vars OR DB migrations.
- **Plan agent for non-trivial architecture choices** (≥ 2 valid approaches,
  security-sensitive, schema changes).
- **Smoke before declaring done**: `tsc -b`, `manage.py check`, restart dev
  servers after `.env` edits.
- **Save auto-memory aggressively** when a non-obvious design move is
  established (see §3 below).
```

---

## 3. Memory system (lives OUTSIDE the repo)

Memory is the **cross-session persistence layer**. It lives at:

```
~/.claude/projects/<encoded-project-path>/memory/
├── MEMORY.md                       # Index — one line per memory file
├── user_<topic>.md                 # Who the user is, role, preferences
├── feedback_<topic>.md             # Corrections + validated approaches
├── project_<topic>.md              # Active work context, owners, deadlines
└── reference_<topic>.md            # Pointers to external systems
```

`<encoded-project-path>` is the absolute project path with `/` replaced by `-`.
Example: `/Users/me/Desktop/MyProj` → `-Users-me-Desktop-MyProj`.

### The four memory types

| Type        | When to save                                                       | Lifespan        |
|-------------|--------------------------------------------------------------------|-----------------|
| `user`      | User's role / expertise / preferences / how they want to collaborate | Long            |
| `feedback`  | User correction OR validated non-obvious approach                  | Long            |
| `project`   | Who's doing what, why, by when                                     | Short (rotates) |
| `reference` | "Where do I find X?" pointer to Linear / Slack / dashboard         | Long            |

### Memory file format

Each memory is its own file with YAML frontmatter:

```markdown
---
name: {{short name}}
description: {{one-line — used to decide relevance in future conversations}}
type: {{user, feedback, project, reference}}
---

{{body — for feedback/project, structure as: rule/fact, then **Why:** and
**How to apply:** lines}}
```

### `MEMORY.md` index

Top-level index, max ~150 chars per line. **Lines after 200 get truncated**
in-context, so keep it tight:

```markdown
# Memory Index

## Project
- [project_overview.md](project_overview.md) — Stack + 14-phase plan summary
- [project_domain.md](project_domain.md) — Core domain logic: portfolios, risk

## Feedback
- [feedback_frontend_typecheck.md](feedback_frontend_typecheck.md) — Use `tsc -b`, not `--noEmit`
- [feedback_workflow_defaults.md](feedback_workflow_defaults.md) — Default Explore (≥3 files), code-reviewer (before done)

## Reference
- [reference_kyc_audit_pattern.md](reference_kyc_audit_pattern.md) — Canonical soft-delete + audit pattern
```

### What NOT to save in memory

- Code patterns / architecture / file paths — derive from current code.
- Git history / who-changed-what — `git log` / `git blame` are authoritative.
- Debugging recipes — the fix is in the code; the commit message has the context.
- Anything already in `CLAUDE.md`.
- Ephemeral task state — use plan / todo list, not memory.

### Verify before recommending from memory

Memories are *frozen at write time*. A memory that names `function X` is a claim
that `X` existed *when the memory was written*. Before recommending it to the
user: grep / read the current file. **"The memory says X exists" ≠ "X exists now."**

---

## 4. `.claude/Planning/` — Source-of-truth feature plans

One markdown file per feature. Lives in the repo so it's version-controlled
alongside the code. **This is the canonical plan; the scratch plan at
`~/.claude/plans/imperative-inventing-moonbeam.md` is per-session ephemeral.**

### Planning doc structure

```markdown
# <Feature Name> — Phased Plan

> Status (YYYY-MM-DD): Phases 0 → X shipped. Brief 2-3 sentence summary
> of what's done, what's in flight, what's blocked.

## Cross-cutting Concerns

> Things that apply to EVERY phase — coding conventions specific to this
> feature, prompt-injection defenses, "do not touch" boundaries with
> adjacent code.

---

## Phase 0 — <Setup name> ✅ Shipped YYYY-MM-DD

**Size:** ~0.5 day. **Dependencies:** none. **User value:** <one line>.

**What ships:**
- <Concrete, testable items. Code-level specificity.>
- <Reference existing helpers/services to reuse.>

**Files:**
- `backend/path/to/file.py` — <what changes>
- `frontend/src/path/to/file.tsx` — <what changes>
- … (new vs modified, in groups)

**Verification:**
- <How to know it works — usually a curl / shell snippet / test name>
- `tsc -b`, `pytest`, `make smoke` clean.

**Not in scope:**
- <Deliberate punts. Documented so future-you knows what to expect.>

---

## Phase 1 — … ⏳ Planned
## Phase 2 — … ❌ Superseded by Phase 2b on YYYY-MM-DD
## Phase 2b — … ✅ Shipped YYYY-MM-DD
…

---

## Suggested execution order

| Sprint | Phase | Why this slot |
|---|---|---|
| 1 | **A** — … | <unblocking value> |
| 2 | **B** — … | <smallest first> |
| — | **L** — … | Deferred — blocked on <external dep> |
```

### Status markers

- ✅ `Shipped YYYY-MM-DD` — done, captured for future readers.
- ⏳ `Planned` — scoped, queued.
- ❌ `SUPERSEDED by Phase X on YYYY-MM-DD` — kept for historical context;
  do NOT re-implement.
- ⏳ `Deferred (external dep / architectural)` — real but blocked.

### When a phase ships

1. Update its status line to `✅ Shipped YYYY-MM-DD`.
2. Add an "Inline review" / "What actually changed" addendum if the
   implementation differed from the plan.
3. Bump the status header at the top of the feature doc.
4. Bump test counts in `CLAUDE.md`'s Current State block.
5. Add a TL;DR entry to `session-handoff.md`.

---

## 5. Per-session workflow

The reliable pattern across this project:

```
1. Read CLAUDE.md (auto-loaded) + session-handoff.md + relevant Planning/<feature>.md.
2. Decide if the task is non-trivial enough to enter plan mode.
3. (Plan mode) Read code, ask AskUserQuestion clarifiers, design the approach.
4. Write the per-session plan to ~/.claude/plans/imperative-inventing-moonbeam.md.
5. ExitPlanMode for user approval.
6. Implement (todos + Edit/Write).
7. Run smoke: tsc -b + manage.py check + targeted pytest.
8. Update Planning/<feature>.md status; mark phase ✅.
9. Bump CLAUDE.md current-state block + session-handoff.md TL;DR.
10. Commit with traceable message; push when user asks.
```

### When to enter plan mode

- ≥ 3 files touched.
- New DB migration.
- New API endpoint or SSE event.
- Architecture choice with > 1 valid approach.
- Security-sensitive surface (auth, encryption, audit, RBAC).

### When to skip plan mode

- Typo fix.
- Single-line rename.
- Doc-only update where the diff is obvious.
- Continuing implementation of an already-approved plan.

### Subagent usage

| Agent | When |
|---|---|
| `Explore` (1–3 parallel) | Scope uncertain or > 3 files / multiple areas to map |
| `Plan` | Non-trivial design with ≥ 2 valid approaches |
| `code-reviewer` | Before declaring done if ≥ 3 files OR modal/portal code OR env vars OR migrations |
| `general-purpose` | Multi-step research/search across the codebase |

Trust-but-verify: subagent reports describe intent, not execution. Always
read the actual diff or grep before reporting success to the user.

---

## 6. The scratch plan file (single, overwritten)

```
~/.claude/plans/imperative-inventing-moonbeam.md
```

- **One per Claude install.** Not per project, not per session.
- **Overwritten every plan-mode entry.** No history kept.
- Approved plans (via ExitPlanMode) flow into the actual files (Planning/,
  CLAUDE.md, code).
- Roadmap docs in `.claude/Planning/` are the canonical SoT; the scratch
  plan is just the working space.

If you need history: commit the relevant `Planning/` doc updates. The scratch
plan should not contain anything that doesn't end up either implemented or
folded into a Planning/ doc.

---

## 7. Pre-commit + audit checklists

`.claude/pre-commit.md` — Run before every commit (~3 min). Smoke + secret
grep + test-count check + status-doc sync.

`.claude/audit-checklist.md` — Deeper review for sensitive changes (auth,
encryption, audit logging, RBAC, secrets, file uploads, SSE). Goes through
known-class-of-bug filters before merge.

Both files codify the "this has bitten us before" pattern so future-you (or
future-Claude) doesn't have to re-learn the same lesson.

---

## 8. `settings.json` — permissions allow-list

```jsonc
{
  "permissions": {
    "allow": [
      // Specific, narrow grants. Examples:
      "Bash(.venv/bin/python manage.py makemigrations users)",
      "Bash(python3:*)",
      "WebFetch(domain:trusted-source.com)",
      "WebSearch",
      "Read(//Users/<you>/Desktop/<project>/**)"
    ],
    "additionalDirectories": [
      "/Users/<you>/.claude/plans"
    ]
  }
}
```

`settings.local.json` is the per-machine overlay — auto-managed, not
hand-edited.

---

## 9. AGENTS.md template (command cookbook)

Separate file because it can be long. Format:

```markdown
# AGENTS.md — <Project> Codebase Guide

## Project Overview
<1-paragraph summary — duplicate of CLAUDE.md's elevator pitch>

## Build / Run / Test Commands

### Backend
<every common dev command as a code block>

### Frontend
<every common dev command as a code block>

### Microservices / external
<same>

## Common Workflows

### "I want to add a new API endpoint"
1. Add view in apps/<x>/views.py.
2. Wire URL in apps/<x>/urls.py.
3. Document in `.claude/api-contract.md`.
4. Add tests in tests/test_<x>.py.

### "I want to add a new DB field"
1. Edit model in apps/<x>/models.py.
2. `manage.py makemigrations <x>`.
3. `manage.py migrate <x>`.
4. Document in `.claude/db-schema.md`.

(… etc — one mini-recipe per recurring task)
```

---

## 10. Bootstrapping a new project

Drop-in steps:

1. `cp WORKFLOW.md` (this file) into the new project's `.claude/`.
2. Write a fresh `CLAUDE.md` at project root using the template in §2.
3. Write a fresh `AGENTS.md` at project root using the template in §9.
4. Create empty stubs for the standard `.claude/` companions:
   - `api-contract.md`, `db-schema.md`, `checklist.md`, `session-handoff.md`,
     `patterns.md`, `pre-commit.md`, `audit-checklist.md`.
5. Create `.claude/Planning/` (empty until the first feature plan).
6. Create `.claude/settings.json` with a minimal allow-list.
7. Start memory fresh — Claude will write to
   `~/.claude/projects/<encoded-path>/memory/` automatically as the
   first session unfolds.

You don't need to migrate old memories across projects — they're
project-scoped by design. The workflow conventions (this file, the
templates, the pre-commit / audit checklists) are the portable artifact.

---

## 11. Anti-patterns this setup avoids

- **One giant CLAUDE.md** — split by topic into `.claude/` companions; keep
  the auto-loaded brief short.
- **Plan-mode scratch becoming SoT** — always graduate approved plans into
  `Planning/<feature>.md` so the scratch can be overwritten freely.
- **Memory as a dumping ground** — only save non-obvious decisions, not
  derivable-from-code facts.
- **Phase docs that decay silently** — when you ship a phase, update its
  status line in the same commit. Never trust an undated planning doc.
- **Missing "Why" + "How to apply"** on feedback memories — without those
  lines, future-Claude follows the rule mechanically and misses edge cases.

---

## 12. Pointers (project-specific examples in this repo)

- `CLAUDE.md` — full template instance.
- `AGENTS.md` — full command cookbook instance.
- `.claude/Planning/agent.md` — exemplary phased feature plan (~10 phases,
  with SUPERSEDED + ✅ + ⏳ + inline security review).
- `.claude/Planning/ekyc.md` — sister exemplar covering a different
  feature area.
- `.claude/checklist.md` — feature-shipping log.
- `.claude/session-handoff.md` — most-recent-block TL;DR pattern.
- `.claude/api-contract.md` — living endpoint spec.
- `.claude/db-schema.md` — living table spec.
- `~/.claude/projects/<encoded>/memory/MEMORY.md` — memory index instance.
