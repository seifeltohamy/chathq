/**
 * Comment keyword casing helpers.
 *
 * Zernio does the comment → keyword matching server-side and doesn't document
 * whether it ignores case. To make sure "link", "LINK" and "Link" all fire,
 * we store each keyword in its common casings when saving an automation, and
 * collapse those variants back to one entry when showing it in the dashboard.
 */

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)(\S)/g, (_, sp: string, c: string) => sp + c.toUpperCase())

/** ['Link'] → ['Link', 'link', 'LINK'] (original first, exact duplicates removed) */
export function expandKeywordCases(keywords: string[]): string[] {
  const out: string[] = []
  for (const raw of keywords) {
    const kw = raw.trim()
    if (!kw) continue
    for (const v of [kw, kw.toLowerCase(), kw.toUpperCase(), titleCase(kw)]) {
      if (!out.includes(v)) out.push(v)
    }
  }
  return out
}

/** ['Link', 'link', 'LINK'] → ['Link'] (first spelling of each keyword wins) */
export function collapseKeywordCases(keywords: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const kw of keywords) {
    const key = kw.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(kw.trim())
  }
  return out
}

/** Expand keywords / excludeKeywords on a create or update body before sending to Zernio. */
export function withExpandedKeywords<T extends Record<string, unknown>>(body: T): T {
  const next: Record<string, unknown> = { ...body }
  for (const field of ['keywords', 'excludeKeywords']) {
    if (Array.isArray(next[field])) next[field] = expandKeywordCases(next[field] as string[])
  }
  return next as T
}

/** Collapse keywords / excludeKeywords on an automation returned from Zernio. */
export function withCollapsedKeywords<T>(automation: T): T {
  if (!automation || typeof automation !== 'object') return automation
  const next: Record<string, unknown> = { ...(automation as Record<string, unknown>) }
  for (const field of ['keywords', 'excludeKeywords']) {
    if (Array.isArray(next[field])) next[field] = collapseKeywordCases(next[field] as string[])
  }
  return next as T
}
