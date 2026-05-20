/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { sql, inArray } from 'drizzle-orm'
import Zernio from '@zernio/node'
import { getDb, schema } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getConfigForConversation, isProcessed, markProcessed, getConfigs } from '@/lib/email-collect-store'
import { sendEmail } from '@/lib/email-sender'

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/

type Result = {
  conversationId:  string
  userId:          string
  participantName: string
  emailFound:      string
  dmSent:          boolean
  emailSent?:      boolean
  error?:          string
}

export async function GET(req: Request) {
  // Auth gate — Railway cron sends `x-poller-secret`
  if (process.env.NODE_ENV === 'production' && process.env.POLLER_SECRET) {
    const header = req.headers.get('x-poller-secret')
    if (header !== process.env.POLLER_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const db = getDb()

  // Find users with at least one email-collect config
  const activeUsers = await db
    .selectDistinct({ userId: schema.emailCollectConfigs.userId })
    .from(schema.emailCollectConfigs)

  if (activeUsers.length === 0) {
    return NextResponse.json({ message: 'No email-collect configs across any user.', sent: [] })
  }

  // Pull each user's Zernio credentials in one query
  const userIds = activeUsers.map(u => u.userId)
  const profileRows = await db
    .select({
      userId:    schema.profiles.userId,
      apiKeyEnc: schema.profiles.zernioApiKeyEnc,
      accountId: schema.profiles.zernioAccountId,
    })
    .from(schema.profiles)
    .where(inArray(schema.profiles.userId, userIds))

  const results: Result[] = []
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  for (const row of profileRows) {
    if (!row.apiKeyEnc || !row.accountId) continue
    const apiKey   = decrypt(row.apiKeyEnc)
    const accountId = row.accountId
    const userId    = row.userId
    const z         = new Zernio({ apiKey })

    // Pull this user's conversations updated in last 72h
    const conversations: any[] = []
    let cursor: string | undefined
    do {
      const { data }: any = await z.messages.listInboxConversations({
        query: { accountId, limit: 50, ...(cursor ? { cursor } : {}) } as any,
      })
      const batch: any[] = data?.data ?? data?.conversations ?? []
      for (const conv of batch) {
        if (conv.updatedTime < cutoff) { cursor = undefined; break }
        conversations.push(conv)
      }
      cursor = data?.pagination?.nextCursor ?? undefined
    } while (cursor && conversations.length < 200)

    // Preload this user's configs
    const userConfigs = await getConfigs(userId)
    if (userConfigs.length === 0) continue

    for (const conv of conversations) {
      if (await isProcessed(userId, conv.id)) continue

      const { data: msgData }: any = await z.messages.getInboxConversationMessages({
        path:  { conversationId: conv.id },
        query: { accountId, limit: 20 } as any,
      })
      const messages: any[] = (msgData?.messages ?? []).sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      if (messages.length === 0) continue

      const outgoingTexts = messages.filter((m: any) => m.direction === 'outgoing').map((m: any) => m.message ?? '')
      const matchedConfig = await getConfigForConversation(userId, outgoingTexts)
      if (!matchedConfig) continue

      const askMsg = messages.find((m: any) =>
        m.direction === 'outgoing' &&
        (m.message ?? '').trim().startsWith(matchedConfig.emailAskText.trim().slice(0, 60))
      )
      if (!askMsg) continue

      const emailReply = messages.find((m: any) =>
        m.direction === 'incoming' &&
        new Date(m.createdAt) > new Date(askMsg.createdAt) &&
        EMAIL_RE.test(m.message ?? '')
      )
      if (!emailReply) continue

      const alreadyReplied = messages.some((m: any) =>
        m.direction === 'outgoing' &&
        new Date(m.createdAt) > new Date(emailReply.createdAt)
      )
      if (alreadyReplied) { await markProcessed(userId, conv.id, emailReply.id); continue }

      const emailFound = EMAIL_RE.exec(emailReply.message)![0]
      const followUpDM = matchedConfig.followUpDM

      if (!followUpDM) {
        await markProcessed(userId, conv.id, emailReply.id)
        results.push({ conversationId: conv.id, userId, participantName: conv.participantName, emailFound, dmSent: false, error: 'No follow-up DM set' })
        continue
      }

      try {
        await z.messages.sendInboxMessage({
          path: { conversationId: conv.id } as any,
          body: { accountId, message: followUpDM },
        })

        let emailSent = false
        try {
          await sendEmail({
            to:      emailFound,
            subject: matchedConfig.emailSubject || "Here's what you asked for!",
            body:    followUpDM,
          })
          emailSent = true
        } catch (emailErr: any) {
          console.error('[poller] Email send failed:', emailErr.message)
        }

        await markProcessed(userId, conv.id, emailReply.id)
        results.push({ conversationId: conv.id, userId, participantName: conv.participantName, emailFound, dmSent: true, emailSent })
      } catch (err: any) {
        results.push({ conversationId: conv.id, userId, participantName: conv.participantName, emailFound, dmSent: false, error: err.message })
      }
    }
  }

  return NextResponse.json({
    users: profileRows.length,
    sent:  results.filter(r => r.dmSent).length,
    results,
  })
}

// Drizzle import note: `sql` is unused but kept for parity if future per-user filters need it.
void sql
