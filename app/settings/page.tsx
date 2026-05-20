'use client'

import { useState, useEffect, useCallback } from 'react'

type Automation = {
  id?: string; name?: string; dmMessage?: string; isActive?: boolean
  stats?: { triggered?: number }
}
type Config = {
  automationId: string; automationName: string; emailAskText: string
  followUpDM: string; emailSubject: string; updatedAt: string
}

function AutomationRow({
  automation, config, onSave, onDelete,
}: {
  automation: Automation
  config:     Config | undefined
  onSave:     (c: Config) => void
  onDelete:   (id: string) => void
}) {
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [deleting,setDeleting]= useState(false)
  const [followUp,setFollowUp]= useState(config?.followUpDM     ?? '')
  const [subject, setSubject] = useState(config?.emailSubject   ?? "Here's what you asked for!")

  const save = async () => {
    setSaving(true)
    const body: Config = {
      automationId:   automation.id!,
      automationName: automation.name!,
      emailAskText:   automation.dmMessage ?? '',
      followUpDM:     followUp,
      emailSubject:   subject,
      updatedAt:      new Date().toISOString(),
    }
    const res = await fetch('/api/email-collect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const d = await res.json()
    setSaving(false)
    if (d.config) { onSave(d.config); setOpen(false) }
  }

  const del = async () => {
    setDeleting(true)
    await fetch(`/api/email-collect/${automation.id}`, { method: 'DELETE' })
    onDelete(automation.id!)
    setDeleting(false)
  }

  const hasConfig = !!config

  return (
    <div className={`bg-surface border rounded-2xl overflow-hidden transition-all ${open ? 'border-green/40' : 'border-border hover:border-border-hi'}`}>
      {/* Row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${automation.isActive ? 'bg-green' : 'bg-note'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{automation.name}</div>
          <div className="font-mono text-xs text-note mt-0.5 truncate">{automation.dmMessage?.slice(0, 70)}…</div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {hasConfig ? (
            <span className="font-mono text-[10px] bg-green-lo text-green px-2.5 py-1 rounded-lg">EMAIL COLLECT ON</span>
          ) : (
            <span className="font-mono text-[10px] bg-raised text-note px-2.5 py-1 rounded-lg">OFF</span>
          )}

          {hasConfig && (
            <button
              onClick={del}
              disabled={deleting}
              className="text-xs text-note hover:text-danger transition-colors font-medium disabled:opacity-40"
            >
              {deleting ? '…' : 'Remove'}
            </button>
          )}

          <button
            onClick={() => setOpen(o => !o)}
            className="text-xs text-prose hover:text-ink px-3 py-1.5 rounded-lg border border-border hover:border-border-hi transition-all font-medium"
          >
            {open ? 'Close' : hasConfig ? 'Edit' : 'Set Up'}
          </button>
        </div>
      </div>

      {/* Expand */}
      {open && (
        <div className="border-t border-border px-5 py-5 space-y-5 step-in">
          {/* Read-only: email ask */}
          <div>
            <div className="font-mono text-[10px] text-note uppercase tracking-widest mb-2">
              Auto-sent DM (asks for email) — pulled from your automation
            </div>
            <div className="bg-raised rounded-xl px-4 py-3 text-sm text-prose leading-relaxed opacity-70 select-none">
              {automation.dmMessage}
            </div>
          </div>

          {/* Editable: follow-up DM */}
          <div>
            <div className="font-mono text-[10px] text-note uppercase tracking-widest mb-2">
              Follow-up DM — sent automatically when they reply with their email
            </div>
            <textarea
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              rows={4}
              placeholder="Here you go, as promised: https://..."
              className="w-full bg-raised border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder-note focus:outline-none focus:border-green/40 resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* Editable: email subject */}
          <div>
            <div className="font-mono text-[10px] text-note uppercase tracking-widest mb-2">
              Email Subject Line
            </div>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Here's what you asked for!"
              className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder-note focus:outline-none focus:border-green/40 transition-colors"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !followUp.trim()}
            className="w-full bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : hasConfig ? 'Save Changes' : 'Enable Email Collect'}
          </button>
        </div>
      )}
    </div>
  )
}

type CredStatus = {
  configured: boolean
  apiKeyMasked: string | null
  profileId: string | null
  accountId: string | null
  igUsername: string | null
  source: 'env' | 'store' | null
  storage: string
}

function CredentialsCard() {
  const [status,  setStatus]  = useState<CredStatus | null>(null)
  const [apiKey,  setApiKey]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/credentials')
    setStatus(await r.json())
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setError(''); setSuccess('')
    const r = await fetch('/api/credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setError(d.error ?? 'Failed'); return }
    setSuccess(`Connected to ${d.igUsername} (profile: ${d.profileName})`)
    setApiKey('')
    setEditing(false)
    load()
  }

  const disconnect = async () => {
    if (!confirm('Disconnect this Zernio account? You can paste a new key after.')) return
    await fetch('/api/credentials', { method: 'DELETE' })
    setSuccess(''); setError('')
    load()
  }

  if (!status) return <div className="h-32 bg-surface border border-border rounded-2xl animate-pulse" />

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-base font-semibold text-ink">Zernio API Credentials</div>
          <p className="text-xs text-prose mt-1">
            Required for everything in this app to talk to your Instagram via Zernio.
          </p>
        </div>
        {status.configured && (
          <span className="font-mono text-[10px] bg-green-lo text-green px-2.5 py-1 rounded-lg">CONNECTED</span>
        )}
      </div>

      {status.configured && !editing ? (
        <div className="space-y-2 text-sm">
          <div className="flex gap-3"><span className="font-mono text-xs text-note w-24">API key</span><span className="font-mono text-prose">{status.apiKeyMasked}</span></div>
          <div className="flex gap-3"><span className="font-mono text-xs text-note w-24">Profile</span><span className="font-mono text-prose">{status.profileId}</span></div>
          <div className="flex gap-3"><span className="font-mono text-xs text-note w-24">Account</span><span className="font-mono text-prose">{status.accountId}</span></div>
          <div className="flex gap-3"><span className="font-mono text-xs text-note w-24">Instagram</span><span className="font-mono text-prose">{status.igUsername}</span></div>
          <div className="flex gap-3"><span className="font-mono text-xs text-note w-24">Source</span><span className="font-mono text-prose">{status.source === 'env' ? '.env file' : `${status.storage} store`}</span></div>
          <div className="flex gap-3 pt-3">
            <button onClick={() => setEditing(true)} className="text-xs text-prose hover:text-ink px-3 py-1.5 rounded-lg border border-border hover:border-border-hi transition-all font-medium">Change key</button>
            {status.source !== 'env' && (
              <button onClick={disconnect} className="text-xs text-note hover:text-danger px-3 py-1.5 rounded-lg border border-border hover:border-danger/40 transition-all font-medium">Disconnect</button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="font-mono text-[10px] text-note uppercase tracking-widest block mb-2">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk_..."
              className="w-full bg-raised border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-ink placeholder-note focus:outline-none focus:border-green/40 transition-colors"
            />
            <p className="text-xs text-note mt-2">Get it from <a href="https://zernio.com/dashboard/api-keys" target="_blank" className="text-prose hover:text-ink underline">zernio.com/dashboard/api-keys</a></p>
          </div>
          {error   && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-green">{success}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !apiKey.startsWith('sk_')}
              className="bg-green hover:bg-[#16a34a] disabled:opacity-40 text-bg font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              {saving ? 'Validating…' : 'Connect Zernio'}
            </button>
            {status.configured && (
              <button onClick={() => { setEditing(false); setApiKey(''); setError('') }} className="text-xs text-prose hover:text-ink px-3 py-1.5 rounded-lg border border-border transition-all font-medium">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [configs,     setConfigs]     = useState<Config[]>([])
  const [mode,        setMode]        = useState('')
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([
      fetch('/api/automations'),
      fetch('/api/email-collect'),
    ])
    const [aData, cData] = await Promise.all([aRes.json(), cRes.json()])
    setAutomations(aData.automations ?? [])
    setConfigs(cData.configs ?? [])
    setMode(cData.storageMode ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const configFor = (id?: string) => configs.find(c => c.automationId === id)

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <div className="mb-10">
        <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-2 uppercase">Settings</div>
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Configuration</h1>
        <p className="text-sm text-prose mt-2">
          Connect your Zernio API key, then configure email-collect on a per-automation basis below.
        </p>
      </div>

      <CredentialsCard />

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink tracking-tight">Email Collect</h2>
        <p className="text-sm text-prose mt-1">
          Pick any automation and set what to DM people after they reply with their email.
        </p>
      </div>

      {mode === 'env' && (
        <div className="bg-raised border border-amber/30 rounded-2xl px-5 py-4 mb-8 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-amber mt-1.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-ink mb-1">Changes won't persist after redeployment</div>
            <p className="text-xs text-prose leading-relaxed">
              Connect Vercel KV to make configs permanent: Vercel dashboard → your project → Storage → Create KV → Connect to Project → Redeploy. One-time setup.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <AutomationRow
              key={a.id}
              automation={a}
              config={configFor(a.id)}
              onSave={c => setConfigs(cs => {
                const idx = cs.findIndex(x => x.automationId === c.automationId)
                return idx >= 0 ? cs.map((x,i) => i === idx ? c : x) : [...cs, c]
              })}
              onDelete={id => setConfigs(cs => cs.filter(c => c.automationId !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
