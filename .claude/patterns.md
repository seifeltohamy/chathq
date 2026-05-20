# Code Patterns

> Conventions to follow when adding code. Update when a new pattern crystallises.

## API routes

```ts
// app/api/<name>/route.ts
import { NextResponse } from 'next/server'
import { getZernio, getProfileId, getAccountId } from '@/lib/zernio'

export async function GET() {
  try {
    const [z, profileId] = await Promise.all([getZernio(), getProfileId()])
    const { data, error } = await z.someResource.someMethod({ query: { profileId } })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message, needsCredentials: true }, { status: 401 })
  }
}
```

**Rules:**
- Always `await getZernio()` per request — never cache a singleton.
- Always return `needsCredentials: true` on 401 — the frontend banner reads it.
- Use `Promise.all` for parallel credential lookups.

## Storage stores (3-tier pattern)

When persisting data that needs to survive across deploys without `.env` edits, use the 3-tier adapter pattern from [lib/credentials-store.ts](../lib/credentials-store.ts) / [lib/email-collect-store.ts](../lib/email-collect-store.ts):

1. **KV** — `process.env.KV_REST_API_URL` present (Vercel + Upstash Redis)
2. **Gist** — `GITHUB_GIST_TOKEN` + `CONFIG_GIST_ID` present (runtime R/W, no redeploy)
3. **File** — local dev fallback (`data/<thing>.json`)
4. **Env** — final fallback for backwards compatibility (read-only)

The adapter picks tier from env vars at module load. Each tier has identical `get`/`set` signatures so the adapter function is a thin switch.

**This pattern is going away in Phase 1** (replaced by Postgres) — don't add new stores in this style; if you need persistence, wait for the schema.

## Page chrome

```tsx
<div className="p-10 max-w-3xl">
  <div className="mb-10">
    <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-2 uppercase">Section</div>
    <h1 className="text-3xl font-semibold text-ink tracking-tight">Page Title</h1>
    <p className="text-sm text-prose mt-2">One-sentence description.</p>
  </div>
  {/* content */}
</div>
```

## Form panels

```tsx
<div className="bg-surface border border-border rounded-2xl p-6">
  <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Label</label>
  <input className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder-note focus:outline-none focus:border-green/40 transition-colors" />
</div>
```

Primary button:
```tsx
<button className="bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
  Save
</button>
```

## Tailwind tokens

Defined in [tailwind.config.mjs](../tailwind.config.mjs). **Never hardcode hex except for the green hover state** (`#16a34a`).

Palette: `bg`, `sidebar`, `surface`, `raised`, `border`, `border-hi`, `ink`, `prose`, `note`, `green`, `green-lo`, `green-mid`, `amber`, `danger`, `blue`.

## File path style

When referencing files in user-facing messages OR doc files, use markdown links:
- File: `[lib/zernio.ts](lib/zernio.ts)`
- Line: `[app/api/webhook/route.ts:42](app/api/webhook/route.ts#L42)`
- Range: `[file.tsx:42-51](file.tsx#L42-L51)`

In code comments inside `.ts` / `.tsx` files, no path conventions — write what you mean.

## Newlines in DM previews

When rendering text that may contain user-typed newlines (DM messages, email subjects), always include `whitespace-pre-wrap break-words` on the container `div`. Without it, CSS collapses `\n` and long URLs overflow.
