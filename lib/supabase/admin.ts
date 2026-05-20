import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS. **Server-side only.**
 * Use sparingly — typically only for admin actions that can't be done
 * as the user (e.g. inserting the profiles row on signup before the
 * user's session is established).
 */
let _admin: ReturnType<typeof createClient> | undefined

export function getSupabaseAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  return _admin
}
