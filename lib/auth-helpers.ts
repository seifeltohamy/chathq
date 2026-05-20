import { eq } from 'drizzle-orm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getDb, schema } from '@/lib/db'

export class UnauthorizedError extends Error {
  constructor() { super('Unauthorized'); this.name = 'UnauthorizedError' }
}

/**
 * For Route Handlers: returns the authenticated Supabase user or throws.
 * Route handlers should catch UnauthorizedError and return 401.
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new UnauthorizedError()
  return user
}

/**
 * For Server Components / pages: returns the user or null. Never throws.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

/**
 * Returns the `profiles` row for the given userId, or null if none exists yet
 * (e.g. signup happened but profile insert failed, or middleware just hasn't
 * redirected to /onboarding yet).
 */
export async function getProfile(userId: string) {
  const db = getDb()
  const rows = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1)
  return rows[0] ?? null
}
