import Zernio from '@zernio/node'
import { eq } from 'drizzle-orm'
import { getDb, schema } from './db'
import { decrypt } from './crypto'
import type { User } from '@supabase/supabase-js'

export class NoCredentialsError extends Error {
  constructor(msg = 'No Zernio credentials configured for this user') {
    super(msg)
    this.name = 'NoCredentialsError'
  }
}

/**
 * Per-user Zernio client. Reads profiles.zernio_api_key_enc, decrypts, and
 * returns a fresh Zernio SDK instance + the resolved profile/account IDs.
 *
 * Throws NoCredentialsError when the user hasn't onboarded yet. Route handlers
 * should catch that and return 401 + `{ needsCredentials: true }`.
 */
export async function getZernioForUser(user: User) {
  const db = getDb()
  const rows = await db
    .select({
      apiKeyEnc: schema.profiles.zernioApiKeyEnc,
      profileId: schema.profiles.zernioProfileId,
      accountId: schema.profiles.zernioAccountId,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1)

  const row = rows[0]
  if (!row?.apiKeyEnc || !row.profileId || !row.accountId) {
    throw new NoCredentialsError()
  }

  const apiKey = decrypt(row.apiKeyEnc)
  return {
    client:    new Zernio({ apiKey }),
    profileId: row.profileId,
    accountId: row.accountId,
  }
}
