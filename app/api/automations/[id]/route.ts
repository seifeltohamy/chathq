import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getZernioForUser, NoCredentialsError } from '@/lib/zernio'
import { withExpandedKeywords, withCollapsedKeywords } from '@/lib/keywords'

type Ctx = { params: Promise<{ id: string }> }

function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError)  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (e instanceof NoCredentialsError) return NextResponse.json({ error: (e as Error).message, needsCredentials: true }, { status: 401 })
  return NextResponse.json({ error: (e as Error).message }, { status: 500 })
}

export async function GET(_: Request, { params }: Ctx) {
  try {
    const user = await requireUser()
    const { client } = await getZernioForUser(user)
    const { id } = await params
    const { data, error } = await client.commentautomations.getCommentAutomation({ path: { automationId: id } })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ...data, automation: withCollapsedKeywords(data?.automation) })
  } catch (e) { return errorResponse(e) }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser()
    const { client } = await getZernioForUser(user)
    const { id } = await params
    const body = await req.json()
    const { data, error } = await client.commentautomations.updateCommentAutomation({ path: { automationId: id }, body: withExpandedKeywords(body) })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ...data, automation: withCollapsedKeywords(data?.automation) })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const user = await requireUser()
    const { client } = await getZernioForUser(user)
    const { id } = await params
    const { error } = await client.commentautomations.deleteCommentAutomation({ path: { automationId: id } })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) { return errorResponse(e) }
}
