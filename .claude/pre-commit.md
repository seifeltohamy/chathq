# Pre-Commit Checklist (~3 min)

Run before every commit. Codifies the "this has bitten us before" list.

## 1. Typecheck

```bash
npx tsc --noEmit
```

Must return clean. Don't commit `// @ts-ignore` to suppress.

## 2. Dev server smoke

```bash
npm run dev
```

Wait for `✓ Ready`. Open http://localhost:3000 and click through:
- `/` dashboard loads, banner state matches creds state.
- `/automations` lists automations OR shows the empty state.
- `/automations/new` step 0 shows reels + "All Posts" card.
- `/settings` credentials card renders the masked key.

No console errors in the dev-server output.

## 3. Secrets sweep

```bash
grep -rn "sk_[a-zA-Z0-9_]\{32,\}" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".env"
```

Must return nothing — no leaked API keys in code or docs.

## 4. `.env` not staged

```bash
git status --porcelain | grep -E "^A.*\.env$"
```

Must return nothing.

## 5. Status-doc sync

When the change ships a feature/phase:
- Update phase status in [.claude/Planning/multi-tenant-ai.md](Planning/multi-tenant-ai.md): `⏳ Planned` → `✅ Shipped YYYY-MM-DD`.
- Add line to [.claude/checklist.md](checklist.md).
- Bump [.claude/session-handoff.md](session-handoff.md) TL;DR.
- Bump "Current State" block in [CLAUDE.md](../CLAUDE.md).

## 6. Touched ≥ 3 files? Run code-reviewer

(Once we have one set up.) For now: re-read the diff yourself, looking for:
- New env vars: documented in `.env.example` AND [.claude/api-contract.md](api-contract.md)?
- New endpoint: documented in [.claude/api-contract.md](api-contract.md)?
- DB migration: documented in [.claude/db-schema.md](db-schema.md)?
- Modal / portal code: tested on a route where the parent has `overflow-hidden`?
