export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-prose">
        <div className="w-5 h-5 rounded-full border-2 border-border border-t-green animate-spin" />
        <span className="font-mono text-xs tracking-widest text-note uppercase">Loading</span>
      </div>
    </div>
  )
}
