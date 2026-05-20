import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Supabase email-confirmation + OAuth callback handler.
 * Exchanges the `code` query param for a session and redirects to /onboarding
 * (or wherever ?next= points).
 */
export async function GET(request: Request) {
  const url  = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${url.origin}${next}`)
  }

  return NextResponse.redirect(`${url.origin}/login?error=callback`)
}
