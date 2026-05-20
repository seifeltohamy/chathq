const FEATURES = [
  'Instant Comment to DM',
  'Auto Email Capture',
  'Live Trigger Analytics',
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-bg grid grid-cols-1 md:grid-cols-[3fr_2fr] font-mono">
      {/* Left — marketing */}
      <div className="hidden md:flex flex-col justify-between p-12 lg:p-16 bg-sidebar border-r border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-green text-lg leading-none">◆</span>
          <div>
            <div className="font-mono text-[13px] font-semibold text-ink tracking-widest uppercase">ChatHQ</div>
            <div className="font-mono text-[9px] text-note tracking-[0.25em] mt-0.5">AUTOMATION OS</div>
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="font-mono text-[10px] tracking-[0.25em] text-note mb-3 uppercase">Welcome</div>
          <h1 className="text-4xl lg:text-5xl font-semibold text-ink tracking-tight leading-[1.1] whitespace-nowrap">
            Automate Your Responses
          </h1>
          <p className="text-sm text-prose mt-4 leading-relaxed max-w-md">
            Turn every comment into a conversation. ChatHQ keeps your DMs flowing while you sleep.
          </p>

          <div className="mt-12 space-y-4">
            {FEATURES.map((title, i) => (
              <div key={title} className="flex items-center gap-5">
                <div className="font-mono text-[10px] text-note tracking-[0.2em] w-6">
                  0{i + 1}
                </div>
                <div className="text-sm font-semibold text-ink">{title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="font-mono text-[10px] text-note tracking-[0.2em] uppercase">
          ChatHQ · Automation OS v0.1
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2.5 mb-10 justify-center">
            <span className="text-green text-lg leading-none">◆</span>
            <div>
              <div className="font-mono text-[13px] font-semibold text-ink tracking-widest uppercase">ChatHQ</div>
              <div className="font-mono text-[9px] text-note tracking-[0.25em] mt-0.5">AUTOMATION OS</div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
