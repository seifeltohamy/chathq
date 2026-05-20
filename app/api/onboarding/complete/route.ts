import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getDb, schema } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

/**
 * Final step of the onboarding wizard. Body: { apiKey, profileId, accountId, igUsername }.
 * Encrypts the key, persists the IDs + IG handle on profiles, sets onboarded_at = now().
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const { apiKey, profileId, accountId, igUsername } = await req.json()

    if (!apiKey?.startsWith('sk_')) return NextResponse.json({ error: 'apiKey required (sk_...)' }, { status: 400 })
    if (!profileId)                return NextResponse.json({ error: 'profileId required' }, { status: 400 })
    if (!accountId)                return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    const db = getDb()
    await db.insert(schema.profiles).values({
      userId:           user.id,
      igUsername:       igUsername ?? null,
      zernioApiKeyEnc:  encrypt(apiKey),
      zernioProfileId:  profileId,
      zernioAccountId:  accountId,
      onboardedAt:      new Date(),
    }).onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        igUsername:       igUsername ?? null,
        zernioApiKeyEnc:  encrypt(apiKey),
        zernioProfileId:  profileId,
        zernioAccountId:  accountId,
        onboardedAt:      new Date(),
        updatedAt:        sql`now()`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
