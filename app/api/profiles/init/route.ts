import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getDb, schema } from '@/lib/db'

/**
 * Creates the profiles row for the just-signed-up user.
 * Called by the signup page once the auth session is live.
 * Idempotent — uses `onConflictDoNothing` so a double-call from a retried
 * request can't break anything.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json().catch(() => ({}))
    const brandName = typeof body.brandName === 'string' && body.brandName.trim() ? body.brandName.trim() : null

    const db = getDb()
    await db.insert(schema.profiles).values({ userId: user.id, brandName }).onConflictDoNothing()
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
