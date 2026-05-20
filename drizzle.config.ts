import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema.ts',
  out:    './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  /**
   * The `auth` schema is Supabase-managed — we only reference auth.users, never write to it.
   * Tell drizzle-kit to leave it alone (don't try to manage tables there).
   */
  schemaFilter: ['public'],
})
