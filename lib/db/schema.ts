import { pgTable, pgSchema, uuid, text, timestamp, primaryKey, unique } from 'drizzle-orm/pg-core'

/**
 * Shadow declaration of Supabase's auth.users so we can FK to it.
 * The `auth` schema is managed by Supabase — we only reference it, never write.
 */
const authSchema = pgSchema('auth')
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

/**
 * profiles — extension of auth.users. One row per signed-up user.
 */
export const profiles = pgTable('profiles', {
  userId:           uuid('user_id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  brandName:        text('brand_name'),
  igUsername:       text('ig_username'),
  zernioApiKeyEnc:  text('zernio_api_key_enc'),
  zernioProfileId:  text('zernio_profile_id'),
  zernioAccountId:  text('zernio_account_id'),
  brevoApiKeyEnc:   text('brevo_api_key_enc'),
  brevoFromEmail:   text('brevo_from_email'),
  onboardedAt:      timestamp('onboarded_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  zernioAccountIdUnique: unique('profiles_zernio_account_id_unique').on(table.zernioAccountId),
}))

/**
 * email_collect_configs — replaces the KV/Gist/file tier in lib/email-collect-store.ts.
 * Composite PK (user_id, automation_id).
 */
export const emailCollectConfigs = pgTable('email_collect_configs', {
  userId:         uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  automationId:   text('automation_id').notNull(),
  automationName: text('automation_name').notNull(),
  emailAskText:   text('email_ask_text').notNull(),
  followUpDm:     text('follow_up_dm').notNull(),
  emailSubject:   text('email_subject').notNull(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.automationId] }),
}))

/**
 * processed_conversations — replaces in-memory Set in lib/email-collect-store.ts.
 * Drives dedup + 30s per-convo throttle.
 */
export const processedConversations = pgTable('processed_conversations', {
  userId:             uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  conversationId:     text('conversation_id').notNull(),
  lastProcessedMsgId: text('last_processed_msg_id'),
  lastRepliedAt:      timestamp('last_replied_at', { withTimezone: true }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.conversationId] }),
}))
