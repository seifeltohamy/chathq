import { NextResponse } from 'next/server'
import { requireUser, getProfile, UnauthorizedError } from '@/lib/auth-helpers'

export async function GET() {
  // Pre-Supabase fallback: no auth configured yet → return null user so the
  // client renders a "signed out" / no-banner state without surfacing a 500.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ user: null, profile: null })
  }
  try {
    const user    = await requireUser()
    const profile = await getProfile(user.id).catch(() => null)
    return NextResponse.json({
      user: {
        id:    user.id,
        email: user.email,
      },
      profile: profile && {
        brandName:        profile.brandName,
        igUsername:       profile.igUsername,
        zernioProfileId:  profile.zernioProfileId,
        zernioAccountId:  profile.zernioAccountId,
        hasZernioKey:     !!profile.zernioApiKeyEnc,
        hasBrevoKey:      !!profile.brevoApiKeyEnc,
        brevoFromEmail:   profile.brevoFromEmail,
        onboardedAt:      profile.onboardedAt,
      },
    })
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
