import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getZernioForUser, NoCredentialsError } from '@/lib/zernio'

export async function GET() {
  try {
    const user = await requireUser()
    const { client, accountId } = await getZernioForUser(user)
    const { data, error } = await client.comments.listInboxComments({ query: { accountId, limit: 25 } })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof UnauthorizedError)  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof NoCredentialsError) return NextResponse.json({ error: (e as Error).message, needsCredentials: true }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
