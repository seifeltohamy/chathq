'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next   = params.get('next') ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    router.push(next)
    router.refresh()
  }

  const supabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-2 uppercase">Sign In</div>
        <h2 className="text-3xl font-semibold text-ink tracking-tight">Welcome back</h2>
        <p className="text-sm text-prose mt-2">Sign in to your ChatHQ dashboard.</p>
      </div>

      {!supabaseConfigured && (
        <div className="bg-amber/[0.06] border border-amber/30 rounded-xl px-4 py-3 text-xs text-prose leading-relaxed">
          <span className="font-semibold text-ink">Supabase not configured.</span> Add <span className="font-mono text-amber">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="font-mono text-amber">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to <span className="font-mono text-amber">.env</span>, then restart the dev server.
        </div>
      )}

      <div className="space-y-4">
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
            type="password" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder-note focus:outline-none focus:border-border-hi transition-colors"
          />
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit" disabled={loading || !email || !password}
        className="w-full bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm py-3.5 rounded-xl transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-prose text-center">
          New here? <Link href="/signup" className="text-ink font-medium hover:text-green transition-colors">Create an account →</Link>
        </p>
      </div>
    </form>
  )
}
