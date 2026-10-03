import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getZernioForUser, NoCredentialsError } from '@/lib/zernio'
import { withExpandedKeywords, withCollapsedKeywords } from '@/lib/keywords'

export async function GET() {
  try {
    const user = await requireUser()
    const { client, profileId } = await getZernioForUser(user)
    const { data, error } = await client.commentautomations.listCommentAutomations({ query: { profileId } })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ...data, automations: data?.automations?.map(withCollapsedKeywords) })
  } catch (e) {
    if (e instanceof UnauthorizedError)  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof NoCredentialsError) return NextResponse.json({ error: e.message, needsCredentials: true }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const { client, profileId, accountId } = await getZernioForUser(user)
    const body = await req.json()
    const { data, error } = await client.commentautomations.createCommentAutomation({
      body: withExpandedKeywords({ profileId, accountId, ...body }),
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ...data, automation: withCollapsedKeywords(data?.automation) })
  } catch (e) {
    if (e instanceof UnauthorizedError)  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e instanceof NoCredentialsError) return NextResponse.json({ error: e.message, needsCredentials: true }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
