import { NextResponse } from 'next/server'
import { requireUser, UnauthorizedError } from '@/lib/auth-helpers'
import { getConfigs, upsertConfig, storageMode, type EmailCollectConfig } from '@/lib/email-collect-store'

export async function GET() {
  try {
    const user = await requireUser()
    const configs = await getConfigs(user.id)
    return NextResponse.json({ configs, storageMode: storageMode() })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body: EmailCollectConfig = await req.json()
    if (!body.automationId || !body.followUpDM?.trim()) {
      return NextResponse.json({ error: 'automationId and followUpDM required' }, { status: 400 })
    }
    const config: EmailCollectConfig = { ...body, updatedAt: new Date().toISOString() }
    await upsertConfig(user.id, config)
    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
