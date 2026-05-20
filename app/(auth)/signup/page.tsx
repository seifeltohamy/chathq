'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()

  const [brandName, setBrandName] = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [info,      setInfo]      = useState('')
  const [loading,   setLoading]   = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setInfo('')

    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setLoading(false); return setError(error.message) }

    // If email confirmation is required, session is null. Show a message.
    if (!data.session) {
      setLoading(false)
      setInfo('Check your inbox to confirm your email, then sign in.')
      return
    }

    // Session live — create the profiles row with the brand name.
    const res = await fetch('/api/profiles/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName: brandName.trim() || null }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return setError(d.error ?? 'Could not create profile')
    }
    router.push('/onboarding')
    router.refresh()
  }

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-2 uppercase">Sign Up</div>
        <h2 className="text-3xl font-semibold text-ink tracking-tight">Create your account</h2>
        <p className="text-sm text-prose mt-2">Start automating your Instagram in minutes.</p>
      </div>

      {!supabaseConfigured && (
        <div className="bg-amber/[0.06] border border-amber/30 rounded-xl px-4 py-3 text-xs text-prose leading-relaxed">
          <span className="font-semibold text-ink">Supabase not configured.</span> Add <span className="font-mono text-amber">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="font-mono text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to <span className="font-mono text-amber">.env</span>, then restart the dev server.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Brand Name</label>
          <input
            type="text" required maxLength={60}
            value={brandName} onChange={e => setBrandName(e.target.value)}
            placeholder="Acme Co."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder-note focus:outline-none focus:border-border-hi transition-colors"
          />
          <p className="text-[10px] text-note mt-1.5">Shown in the footer and outgoing email signatures.</p>
        </div>
        <div>
          <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Email</label>
          <input
            type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder-note focus:outline-none focus:border-border-hi transition-colors"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Password</label>
          <input
            type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder-note focus:outline-none focus:border-border-hi transition-colors"
          />
          <p className="text-[10px] text-note mt-1.5">Min 8 characters.</p>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {info  && <p className="text-xs text-green">{info}</p>}

      <button
        type="submit" disabled={loading || !brandName.trim() || !email || password.length < 8}
        className="w-full bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm py-3.5 rounded-xl transition-colors"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-prose text-center">
          Already have one? <Link href="/login" className="text-ink font-medium hover:text-green transition-colors">Sign in →</Link>
        </p>
      </div>
    </form>
  )
}
