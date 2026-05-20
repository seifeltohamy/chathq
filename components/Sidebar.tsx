'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const nav = [
  { href: '/',            label: 'Dashboard',   icon: '◈' },
  { href: '/automations', label: 'Automations', icon: '⚡' },
  { href: '/sequences',   label: 'Sequences',   icon: '⋮⋮' },
  { href: '/analytics',   label: 'Analytics',   icon: '▲' },
  { href: '/settings',    label: 'Settings',    icon: '⚙' },
]

type Me = {
  user:    { id: string; email: string } | null
  profile: { igUsername: string | null; hasZernioKey: boolean; onboardedAt: string | null } | null
}

export default function Sidebar() {
  const router = useRouter()
  const path   = usePathname()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(setMe)
      .catch(() => setMe(null))
  }, [path])

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-green text-lg leading-none">◆</span>
          <div>
            <div className="font-mono text-[13px] font-semibold text-ink tracking-widest uppercase">ChatHQ</div>
            <div className="font-mono text-[9px] text-note tracking-[0.25em] mt-0.5">AUTOMATION OS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-100 group
                ${active
                  ? 'bg-green-lo text-green'
                  : 'text-prose hover:text-ink hover:bg-raised'}
              `}
            >
              <span className={`font-mono text-base leading-none w-5 text-center ${active ? 'text-green' : 'text-note group-hover:text-prose'}`}>
                {icon}
              </span>
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green" />}
            </Link>
          )
        })}
      </nav>

      {/* CTA */}
      <div className="px-3 pb-3">
        <Link
          href="/automations/new"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-green text-bg text-sm font-semibold hover:bg-[#16a34a] transition-colors"
        >
          <span className="text-base leading-none">+</span>
          New Automation
        </Link>
      </div>

      {/* Account */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${me?.profile?.hasZernioKey ? 'bg-green animate-pulse-slow' : 'bg-note'}`} />
          <span className="font-mono text-[12px] text-prose truncate">
            {me?.profile?.igUsername ?? me?.user?.email ?? '—'}
          </span>
        </div>
        <div className="font-mono text-[10px] text-note mt-1 pl-[18px]">
          {me?.profile?.hasZernioKey ? 'Instagram · Live' : me?.user ? 'Not configured' : 'Signed out'}
        </div>
        {me?.user && (
          <button
            onClick={signOut}
            className="mt-3 w-full text-left font-mono text-[10px] text-note hover:text-prose transition-colors"
          >
            ↩ Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
