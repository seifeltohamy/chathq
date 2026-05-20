import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

declare global {
  // eslint-disable-next-line no-var
  var _dbClient: ReturnType<typeof drizzle<typeof schema>> | undefined
}

/**
 * Drizzle client singleton over postgres-js.
 * `prepare: false` keeps it compatible with Supabase's transaction-mode pooler
 * (no perf cost on direct connections — pgbouncer transaction mode doesn't support prepared statements).
 */
export function getDb() {
  if (global._dbClient) return global._dbClient
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL env var is required')
  const sql = postgres(url, { prepare: false })
  const db  = drizzle(sql, { schema })
  global._dbClient = db
  return db
}

export { schema }
