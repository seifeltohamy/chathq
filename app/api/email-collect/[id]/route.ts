import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { deleteConfig } from '@/lib/email-collect-store'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const user = await requireUser()
    const { id } = await params
    await deleteConfig(user.id, id)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
