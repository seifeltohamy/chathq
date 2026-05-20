/**
 * Zernio API credentials store.
 *
 * Storage tiers (auto-detected):
 *  1. Vercel KV        — KV_REST_API_URL set
 *  2. GitHub Gist      — GITHUB_GIST_TOKEN + CONFIG_GIST_ID set
 *  3. Local file       — dev fallback
 *  4. .env fallback    — if no creds in store, read ZERNIO_* env vars
 *
 * The store lets the deploy run with no env vars — user pastes their key in
 * /settings, the server validates it against Zernio, stores it, and from then
 * on every route reads from the store instead of process.env.
 */

export type Credentials = {
  apiKey:     string
  profileId:  string
  accountId:  string
  igUsername: string
  updatedAt:  string
}

/* ── Tier 1: Vercel KV ──────────────────────────────────── */
async function kvGet(): Promise<Credentials | null> {
  const { kv } = await import('@vercel/kv')
  return (await kv.get<Credentials>('zernio-credentials')) ?? null
}
async function kvSet(creds: Credentials) {
  const { kv } = await import('@vercel/kv')
  await kv.set('zernio-credentials', creds)
}
async function kvClear() {
  const { kv } = await import('@vercel/kv')
  await kv.del('zernio-credentials')
}

/* ── Tier 2: GitHub Gist ────────────────────────────────── */
const GIST_FILE = 'credentials.json'

async function gistGet(): Promise<Credentials | null> {
  const res = await fetch(`https://api.github.com/gists/${process.env.CONFIG_GIST_ID}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_GIST_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  try { return JSON.parse(data.files[GIST_FILE]?.content ?? 'null') }
  catch { return null }
}
async function gistSet(creds: Credentials) {
  await fetch(`https://api.github.com/gists/${process.env.CONFIG_GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_GIST_TOKEN}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(creds, null, 2) } },
    }),
  })
}
async function gistClear() {
  await gistSet({ apiKey: '', profileId: '', accountId: '', igUsername: '', updatedAt: '' })
}

/* ── Tier 3: Local file ─────────────────────────────────── */
async function fileGet(): Promise<Credentials | null> {
  const fs   = (await import('fs')).default
  const path = (await import('path')).default
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'credentials.json'), 'utf8')) }
  catch { return null }
}
async function fileSet(creds: Credentials) {
  const fs   = (await import('fs')).default
  const path = (await import('path')).default
  const file = path.join(process.cwd(), 'data', 'credentials.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(creds, null, 2))
}
async function fileClear() {
  const fs   = (await import('fs')).default
  const path = (await import('path')).default
  const file = path.join(process.cwd(), 'data', 'credentials.json')
  try { fs.unlinkSync(file) } catch { /* not there */ }
}

/* ── Adapter ────────────────────────────────────────────── */
const tier = () =>
  process.env.KV_REST_API_URL                                   ? 'kv'   :
  process.env.GITHUB_GIST_TOKEN && process.env.CONFIG_GIST_ID  ? 'gist' :
                                                                  'file'

async function storeGet(): Promise<Credentials | null> {
  switch (tier()) {
    case 'kv':   return kvGet()
    case 'gist': return gistGet()
    default:     return fileGet()
  }
}

async function storeSet(creds: Credentials) {
  switch (tier()) {
    case 'kv':   return kvSet(creds)
    case 'gist': return gistSet(creds)
    default:     return fileSet(creds)
  }
}

async function storeClear() {
  switch (tier()) {
    case 'kv':   return kvClear()
    case 'gist': return gistClear()
    default:     return fileClear()
  }
}

/* ── .env fallback ──────────────────────────────────────── */
function envCredentials(): Credentials | null {
  const apiKey    = process.env.ZERNIO_API_KEY
  const profileId = process.env.ZERNIO_PROFILE_ID
  const accountId = process.env.ZERNIO_ACCOUNT_ID
  if (!apiKey || !profileId || !accountId) return null
  return {
    apiKey,
    profileId,
    accountId,
    igUsername: process.env.NEXT_PUBLIC_IG_USERNAME ?? '',
    updatedAt:  'env',
  }
}

/* ── Public API ─────────────────────────────────────────── */

let _cache: Credentials | null | undefined

export async function getCredentials(): Promise<Credentials | null> {
  if (_cache !== undefined) return _cache
  const fromStore = await storeGet().catch(() => null)
  if (fromStore && fromStore.apiKey) { _cache = fromStore; return fromStore }
  const fromEnv = envCredentials()
  _cache = fromEnv
  return fromEnv
}

export async function requireCredentials(): Promise<Credentials> {
  const c = await getCredentials()
  if (!c) {
    throw new Error('Zernio credentials not configured. Visit /settings to add your API key.')
  }
  return c
}

export async function saveCredentials(creds: Credentials) {
  await storeSet(creds)
  _cache = creds
}

export async function clearCredentials() {
  await storeClear()
  _cache = null
}

export const storageMode = () => tier()
