/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import Zernio from '@zernio/node'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'

/**
 * Validates a pasted Zernio API key by calling Zernio's profiles + accounts
 * endpoints and returning the lists so the onboarding wizard can let the user
 * pick. Does NOT save anything yet — that happens in /api/onboarding/complete.
 */
export async function POST(req: Request) {
  try {
    await requireUser()
    const { apiKey } = await req.json()
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk_')) {
      return NextResponse.json({ error: 'API key must be a string starting with sk_' }, { status: 400 })
    }

    const z = new Zernio({ apiKey })

    const { data: profilesData, error: profilesErr } = await z.profiles.listProfiles()
    if (profilesErr) return NextResponse.json({ error: 'Invalid API key — Zernio rejected the request' }, { status: 401 })

    const { data: accountsData } = await z.accounts.listAccounts()
    const profiles = (profilesData as any)?.profiles ?? []
    const igAccounts = ((accountsData as any)?.accounts ?? []).filter((a: any) => a.platform === 'instagram')

    return NextResponse.json({
      profiles: profiles.map((p: any) => ({ id: p._id, name: p.name, isDefault: p.isDefault })),
      igAccounts: igAccounts.map((a: any) => ({
        id:          a._id,
        username:    a.username ?? a.displayName ?? null,
        displayName: a.displayName ?? null,
      })),
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
