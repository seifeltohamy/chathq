import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresh the Supabase session in middleware so server components see a
 * fresh user. Follows the @supabase/ssr Next.js App Router recipe.
 *
 * Returns the response to use (with updated cookies). If the user is
 * unauthenticated and visiting a gated route, returns a redirect to /login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Pre-Supabase fallback: if env vars aren't set yet, pass through without auth gating.
  // This keeps existing single-tenant flows working until the user provisions Supabase.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public paths — never redirect.
  const PUBLIC = ['/login', '/signup', '/auth/callback', '/api/webhook']
  const isPublic = PUBLIC.some(p => path === p || path.startsWith(p + '/'))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Signed-in user hitting /login or /signup → bounce to dashboard.
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Signed-in but not onboarded → push to /onboarding (except /api/me, /api/profiles/init,
  // /api/onboarding/* themselves, and /auth/* which need to work mid-onboarding).
  if (user && !path.startsWith('/onboarding') && !path.startsWith('/api/onboarding') && !path.startsWith('/api/me') && !path.startsWith('/api/profiles/init')) {
    try {
      const { data } = await supabase.from('profiles').select('onboarded_at').eq('user_id', user.id).maybeSingle()
      if (data && !data.onboarded_at) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        url.search = ''
        return NextResponse.redirect(url)
      }
    } catch {
      // Profile lookup failed (e.g. profiles table not migrated yet) — let request through.
    }
  }

  return supabaseResponse
}
