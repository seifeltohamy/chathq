'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CredentialsBanner() {
  const [show, setShow] = useState(false)
  const path = usePathname()

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // Only show the banner when authenticated AND no Zernio key configured.
        // Pre-Phase 4 onboarding redirect catches new signups; for users mid-flow,
        // the banner is a fallback nudge to /onboarding (or /settings post-onboard).
        setShow(!!d?.user && !d.profile?.hasZernioKey)
      })
      .catch(() => setShow(false))
  }, [path])

  if (!show || path?.startsWith('/settings') || path?.startsWith('/onboarding') || path?.startsWith('/login') || path?.startsWith('/signup')) return null

  return (
    <div className="bg-amber/10 border-b border-amber/30 px-6 py-3 flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
      <div className="text-sm text-ink">
        <span className="font-semibold">No Zernio API key configured.</span>
        <span className="text-prose"> Nothing on this dashboard can talk to Instagram until you add one.</span>
      </div>
      <Link
        href="/onboarding"
        className="ml-auto bg-amber text-bg text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        Finish setup →
      </Link>
    </div>
  )
}
