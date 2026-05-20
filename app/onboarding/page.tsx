'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Profile  = { id: string; name: string; isDefault?: boolean }
type IgAccount = { id: string; username: string | null; displayName: string | null }

const STEPS = ['Paste Key', 'Pick Profile + Account', 'Done']

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all ${
              i < step  ? 'bg-green text-bg' :
              i === step ? 'bg-green-lo text-green ring-1 ring-green/40' :
                           'bg-raised text-note'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium transition-colors ${
              i === step ? 'text-ink' : i < step ? 'text-prose' : 'text-note'
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px mx-3 transition-colors ${i < step ? 'bg-green/40' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [profiles,  setProfiles]  = useState<Profile[]>([])
  const [igAccounts, setIgAccounts] = useState<IgAccount[]>([])
  const [profileId,  setProfileId]  = useState<string | null>(null)
  const [accountId,  setAccountId]  = useState<string | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const validateKey = async () => {
    setLoading(true); setError('')
    const r = await fetch('/api/onboarding/zernio-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    })
    const d = await r.json()
    setLoading(false)
    if (!r.ok) return setError(d.error ?? 'Failed to validate')
    if (!d.profiles?.length)   return setError('No profiles found on this Zernio account')
    if (!d.igAccounts?.length) return setError('No Instagram account connected at Zernio. Connect one then try again.')
    setProfiles(d.profiles)
    setIgAccounts(d.igAccounts)
    setProfileId(d.profiles[0].id)
    setAccountId(d.igAccounts[0].id)
    setStep(1)
  }

  const finish = async () => {
    if (!profileId || !accountId) return
    setLoading(true); setError('')
    const picked = igAccounts.find(a => a.id === accountId)
    const igUsername = picked?.username ? `@${picked.username}` : picked?.displayName ?? null
    const r = await fetch('/api/onboarding/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim(), profileId, accountId, igUsername }),
    })
    setLoading(false)
    if (!r.ok) { const d = await r.json().catch(() => ({})); return setError(d.error ?? 'Failed') }
    setStep(2)
    setTimeout(() => { router.push('/'); router.refresh() }, 1200)
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-2 uppercase">Onboarding</div>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Connect your Zernio account</h1>
        <p className="text-sm text-prose mt-2">Three steps and you're live.</p>
      </div>

      <StepBar step={step} />

      {step === 0 && (
        <div className="step-in space-y-5">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Zernio API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk_..."
              className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-ink placeholder-note focus:outline-none focus:border-green/40 transition-colors"
            />
            <p className="text-xs text-note mt-2">
              Get it from <a href="https://zernio.com/dashboard/api-keys" target="_blank" rel="noreferrer" className="text-prose hover:text-ink underline">zernio.com/dashboard/api-keys</a>.
              Make sure your Instagram account is connected in Zernio first.
            </p>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            onClick={validateKey}
            disabled={loading || !apiKey.startsWith('sk_')}
            className="w-full bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            {loading ? 'Validating…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="step-in space-y-5">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
            <div>
              <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Profile</label>
              <select
                value={profileId ?? ''}
                onChange={e => setProfileId(e.target.value)}
                className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-green/40 transition-colors"
              >
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' · default' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">Instagram Account</label>
              <select
                value={accountId ?? ''}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-green/40 transition-colors"
              >
                {igAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.username ? `@${a.username}` : a.displayName ?? a.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="text-sm text-prose hover:text-ink px-4 py-3 transition-colors font-medium"
            >
              ← Back
            </button>
            <button
              onClick={finish}
              disabled={loading || !profileId || !accountId}
              className="flex-1 bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              {loading ? 'Saving…' : 'Finish setup'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step-in text-center py-12">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-2xl font-semibold text-ink mb-2">You're live</h2>
          <p className="text-sm text-prose">Redirecting to your dashboard…</p>
        </div>
      )}
    </div>
  )
}
