/**
 * Per-automation email-collect configs (Phase 3 — over Drizzle / Supabase Postgres).
 *
 * Public function names preserved from the previous KV/Gist/file implementation —
 * `userId` is now the first arg of each. Callers were updated in Phase 3.
 */

import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema } from './db'

export type EmailCollectConfig = {
  automationId:   string
  automationName: string
  emailAskText:   string
  followUpDM:     string
  emailSubject:   string
  updatedAt:      string
}

type DbRow = typeof schema.emailCollectConfigs.$inferSelect

function rowToConfig(r: DbRow): EmailCollectConfig {
  return {
    automationId:   r.automationId,
    automationName: r.automationName,
    emailAskText:   r.emailAskText,
    followUpDM:     r.followUpDm,
    emailSubject:   r.emailSubject,
    updatedAt:      r.updatedAt.toISOString(),
  }
}

export async function getConfigs(userId: string): Promise<EmailCollectConfig[]> {
  const db = getDb()
  const rows = await db.select().from(schema.emailCollectConfigs).where(eq(schema.emailCollectConfigs.userId, userId))
  return rows.map(rowToConfig)
}

export async function upsertConfig(userId: string, config: EmailCollectConfig) {
  const db = getDb()
  await db.insert(schema.emailCollectConfigs).values({
    userId,
    automationId:   config.automationId,
    automationName: config.automationName,
    emailAskText:   config.emailAskText,
    followUpDm:     config.followUpDM,
    emailSubject:   config.emailSubject,
  }).onConflictDoUpdate({
    target: [schema.emailCollectConfigs.userId, schema.emailCollectConfigs.automationId],
    set: {
      automationName: config.automationName,
      emailAskText:   config.emailAskText,
      followUpDm:     config.followUpDM,
      emailSubject:   config.emailSubject,
      updatedAt:      sql`now()`,
    },
  })
}

export async function deleteConfig(userId: string, automationId: string) {
  const db = getDb()
  await db.delete(schema.emailCollectConfigs).where(and(
    eq(schema.emailCollectConfigs.userId, userId),
    eq(schema.emailCollectConfigs.automationId, automationId),
  ))
}

export async function getConfigForConversation(userId: string, outgoingMessages: string[]): Promise<EmailCollectConfig | null> {
  const all = await getConfigs(userId)
  for (const msg of outgoingMessages) {
    const match = all.find(c => msg.trim().startsWith(c.emailAskText.trim().slice(0, 60)))
    if (match) return match
  }
  return null
}

/**
 * processed_conversations bookkeeping — replaces the old in-memory Set.
 * `isProcessed` returns true if we've already replied in this conversation
 * (i.e. last_replied_at is set), which means we shouldn't re-fire.
 */
export async function isProcessed(userId: string, conversationId: string): Promise<boolean> {
  const db = getDb()
  const rows = await db
    .select({ lastRepliedAt: schema.processedConversations.lastRepliedAt })
    .from(schema.processedConversations)
    .where(and(
      eq(schema.processedConversations.userId, userId),
      eq(schema.processedConversations.conversationId, conversationId),
    ))
    .limit(1)
  return !!rows[0]?.lastRepliedAt
}

export async function markProcessed(userId: string, conversationId: string, lastMsgId?: string) {
  const db = getDb()
  await db.insert(schema.processedConversations).values({
    userId,
    conversationId,
    lastProcessedMsgId: lastMsgId,
    lastRepliedAt:      new Date(),
  }).onConflictDoUpdate({
    target: [schema.processedConversations.userId, schema.processedConversations.conversationId],
    set: {
      lastProcessedMsgId: lastMsgId,
      lastRepliedAt:      new Date(),
    },
  })
}

// storageMode is gone — single backend now. Routes that still expect it
// (api/email-collect GET) hardcode 'postgres' going forward.
export const storageMode = () => 'postgres' as const
