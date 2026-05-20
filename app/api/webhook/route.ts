/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import Zernio from '@zernio/node'
import { getDb, schema } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getConfigForConversation, isProcessed, markProcessed } from '@/lib/email-collect-store'
import { sendEmail } from '@/lib/email-sender'

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
const L = (msg: string) => console.log(`[webhook] ${msg}`)

/**
 * Tenant routing — given the Zernio webhook payload, find the user whose
 * `profiles.zernio_account_id` matches the IG account ID in the payload.
 *
 * NOTE: the exact field name on the payload is TBD — could be `account.id`,
 * `message.accountId`, or `conversation.accountId`. We check all three. The
 * FULL PAYLOAD log above lets us confirm against a real fire and tighten this.
 */
async function resolveTenant(payload: any) {
  const candidates = [
    payload?.account?.id,
    payload?.message?.accountId,
    payload?.conversation?.accountId,
  ].filter(Boolean) as string[]
  if (candidates.length === 0) return null

  const db = getDb()
  for (const igAccountId of candidates) {
    const rows = await db
      .select({
        userId:    schema.profiles.userId,
        apiKeyEnc: schema.profiles.zernioApiKeyEnc,
        accountId: schema.profiles.zernioAccountId,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.zernioAccountId, igAccountId))
      .limit(1)
    if (rows[0]?.apiKeyEnc) {
      return { userId: rows[0].userId, accountId: rows[0].accountId!, apiKey: decrypt(rows[0].apiKeyEnc) }
    }
  }
  return null
}

export async function POST(req: Request) {
  const payload = await req.json()

  L(`FULL PAYLOAD: ${JSON.stringify(payload)}`)
  L(`event=${payload.event} direction=${payload.message?.direction}`)

  if (payload.event !== 'message.received') return NextResponse.json({ ok: true })
  if (payload.message?.direction !== 'incoming') return NextResponse.json({ ok: true })

  const text           = payload.message?.text ?? ''
  // Zernio webhook sends an internal conversationId — the inbox API uses platformConversationId
  const conversationId = payload.conversation?.platformConversationId ?? payload.message?.conversationId
  const senderName     = payload.message?.sender?.name ?? 'unknown'

  L(`convId=${conversationId} text="${text.slice(0,40)}"`)

  if (!conversationId || !text) return NextResponse.json({ ok: true, bail: 'no-conv-or-text' })

  // Multi-tenant routing — bail silently on no-match (don't leak which IDs are valid)
  const tenant = await resolveTenant(payload)
  if (!tenant) return NextResponse.json({ ok: true, bail: 'no-tenant-match' })

  const emailMatch = EMAIL_RE.exec(text)
  if (!emailMatch) return NextResponse.json({ ok: true, bail: 'no-email-in-text' })
  const emailFound = emailMatch[0]

  L(`email found: ${emailFound} (tenant: ${tenant.userId})`)

  if (await isProcessed(tenant.userId, conversationId)) {
    return NextResponse.json({ ok: true, bail: 'already-processed' })
  }

  const z = new Zernio({ apiKey: tenant.apiKey })
  const { data: msgData }: any = await z.messages.getInboxConversationMessages({
    path:  { conversationId },
    query: { accountId: tenant.accountId, limit: 20 } as any,
  })
  const messages: any[] = (msgData?.messages ?? []).sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  L(`messages fetched: ${messages.length}`)

  const outgoingTexts = messages
    .filter((m: any) => m.direction === 'outgoing')
    .map((m: any) => m.message ?? '')
  L(`outgoing msgs: ${outgoingTexts.length} | first60: "${outgoingTexts[0]?.slice(0,60)}"`)

  const matchedConfig = await getConfigForConversation(tenant.userId, outgoingTexts)
  L(`matchedConfig: ${matchedConfig ? matchedConfig.automationId : 'NONE'}`)
  if (!matchedConfig?.followUpDM) return NextResponse.json({ ok: true, bail: 'no-matched-config' })

  const askMsg = messages.find((m: any) =>
    m.direction === 'outgoing' &&
    (m.message ?? '').trim().startsWith(matchedConfig.emailAskText.trim().slice(0, 60))
  )
  L(`askMsg found: ${!!askMsg}`)
  if (!askMsg) return NextResponse.json({ ok: true, bail: 'no-ask-msg' })

  const incomingTime = new Date(payload.message?.sentAt ?? payload.message?.createdAt ?? Date.now())
  const alreadyReplied = messages.some((m: any) =>
    m.direction === 'outgoing' &&
    new Date(m.createdAt ?? m.sentAt) > incomingTime &&
    (m.message ?? '').trim() === matchedConfig.followUpDM.trim()
  )
  if (alreadyReplied) {
    await markProcessed(tenant.userId, conversationId, payload.message?.id)
    return NextResponse.json({ ok: true, bail: 'already-replied' })
  }

  L(`firing DM to convId=${conversationId}`)
  const [dmResult, emailResult] = await Promise.allSettled([
    z.messages.sendInboxMessage({
      path: { conversationId } as any,
      body: { accountId: tenant.accountId, message: matchedConfig.followUpDM },
    }),
    sendEmail({
      to:      emailFound,
      subject: matchedConfig.emailSubject || "Here's what you asked for!",
      body:    matchedConfig.followUpDM,
    }),
  ])

  await markProcessed(tenant.userId, conversationId, payload.message?.id)
  L(`done — DM: ${dmResult.status}${dmResult.status==='rejected'?' ERR:'+( dmResult as any).reason?.message:''} | email: ${emailResult.status}`)

  return NextResponse.json({
    ok: true, emailFound, senderName,
    dmSent:    dmResult.status === 'fulfilled',
    emailSent: emailResult.status === 'fulfilled',
    dmError:   dmResult.status === 'rejected' ? (dmResult as any).reason?.message : undefined,
  })
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
