/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import Zernio from '@zernio/node'
import { eq } from 'drizzle-orm'
import { requireUser, UnauthorizedError, getProfile } from '@/lib/auth-helpers'
import { getDb, schema } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  try {
    const user = await requireUser()
    const profile = await getProfile(user.id)
    if (!profile) return NextResponse.json({ configured: false })
    return NextResponse.json({
      configured:   !!(profile.zernioApiKeyEnc && profile.zernioProfileId && profile.zernioAccountId),
      apiKeyMasked: profile.zernioApiKeyEnc ? 'sk_••••' : null,
      profileId:    profile.zernioProfileId,
      accountId:    profile.zernioAccountId,
      igUsername:   profile.igUsername,
      source:       'store',
      storage:      'postgres',
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const { apiKey } = await req.json()
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk_')) {
      return NextResponse.json({ error: 'API key must be a string starting with sk_' }, { status: 400 })
    }

    const z = new Zernio({ apiKey })

    const { data: profilesData, error: profileErr } = await z.profiles.listProfiles()
    if (profileErr) return NextResponse.json({ error: 'Invalid API key — Zernio rejected the request' }, { status: 401 })

    const profiles = (profilesData as any)?.profiles ?? []
    if (profiles.length === 0) return NextResponse.json({ error: 'No profiles found on this Zernio account' }, { status: 400 })
    const profile = profiles[0]

    const { data: accountsData } = await z.accounts.listAccounts()
    const igAccounts = ((accountsData as any)?.accounts ?? []).filter((a: any) => a.platform === 'instagram')
    if (igAccounts.length === 0) return NextResponse.json({
      error: 'No Instagram account connected. Connect one at zernio.com/dashboard → Accounts, then try again.',
    }, { status: 400 })
    const account = igAccounts[0]

    const igUsername = `@${account.username ?? account.displayName ?? 'unknown'}`
    const db = getDb()
    await db.insert(schema.profiles).values({
      userId:           user.id,
      igUsername,
      zernioApiKeyEnc:  encrypt(apiKey),
      zernioProfileId:  profile._id,
      zernioAccountId:  account._id,
    }).onConflictDoUpdate({
      target: schema.profiles.userId,
      set: {
        igUsername,
        zernioApiKeyEnc:  encrypt(apiKey),
        zernioProfileId:  profile._id,
        zernioAccountId:  account._id,
      },
    })

    return NextResponse.json({
      success: true,
      profileId: profile._id,
      accountId: account._id,
      igUsername,
      profileName: profile.name,
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireUser()
    const db = getDb()
    await db.update(schema.profiles)
      .set({ zernioApiKeyEnc: null, zernioProfileId: null, zernioAccountId: null, igUsername: null })
      .where(eq(schema.profiles.userId, user.id))
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
