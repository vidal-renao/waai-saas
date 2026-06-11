export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500">
          <span className="text-2xl font-bold text-white">W</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white">
          WAAI SaaS
        </h1>

        <p className="text-lg text-zinc-400 max-w-md">
          WhatsApp AI Agent Platform. Build, configure and deploy intelligent
          WhatsApp agents for your business — no code required.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {[
            "Multi-tenant",
            "Claude API",
            "RAG",
            "Human Handoff",
            "Lead Capture",
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-left w-full max-w-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Status
          </p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-zinc-300">
              Fase 0 complete — Fase 1 coming next
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
