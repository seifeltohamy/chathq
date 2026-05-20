'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import CredentialsBanner from './CredentialsBanner'

/**
 * Conditionally renders the dashboard chrome (sidebar + status bar + credentials banner)
 * around child pages. Hides everything on auth pages (/login, /signup, /auth/*).
 * Redirects unauthenticated users to /login.
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const path   = usePathname()
  const router = useRouter()
  const bare   = path?.startsWith('/login') || path?.startsWith('/signup') || path?.startsWith('/auth/')

  const [igHandle,  setIgHandle]  = useState<string | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [authed,    setAuthed]    = useState<boolean | null>(null) // null = checking

  useEffect(() => {
    if (bare) { setAuthed(true); return }
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.user) {
          router.replace('/login')
          setAuthed(false)
          return
        }
        setAuthed(true)
        setIgHandle(d?.profile?.igUsername ?? d?.user?.email ?? null)
        setBrandName(d?.profile?.brandName ?? null)
      })
      .catch(() => { router.replace('/login'); setAuthed(false) })
  }, [path, bare, router])

  if (bare) return <>{children}</>

  if (authed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-prose">
          <div className="w-5 h-5 rounded-full border-2 border-border border-t-green animate-spin" />
          <span className="font-mono text-xs tracking-widest text-note uppercase">Loading</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CredentialsBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <div className="flex-shrink-0 h-8 bg-sidebar border-t border-border flex items-center px-5 gap-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-slow" />
            <span className="font-mono text-[11px] text-prose">{igHandle ?? '—'}</span>
          </div>
          <span className="font-mono text-[11px] text-note">Instagram</span>
          <span className="font-mono text-[11px] text-note">·</span>
          <span className="font-mono text-[11px] text-note">{brandName ?? 'ChatHQ'}</span>
          <div className="ml-auto font-mono text-[11px] text-note">Automation OS v0.1</div>
        </div>
      </div>
    </div>
  )
}
