import { Brain, MessageCircle, Users, Workflow, Zap, BarChart3, Shield, Cpu } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'RAG Knowledge Base',
    desc: 'Upload documents and PDFs. Agents answer from your content — grounded responses, not hallucinations.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp Integration',
    desc: 'Connect real numbers via Whapi or test instantly with the built-in mock provider.',
  },
  {
    icon: Users,
    title: 'Human Handoff',
    desc: 'Agents escalate complex cases automatically. Operators claim, resolve, and add internal notes.',
  },
  {
    icon: Workflow,
    title: 'Multi-Agent Routing',
    desc: 'Each workspace runs fully isolated agents with independent data, prompts, and knowledge.',
  },
  {
    icon: Zap,
    title: 'Lead Capture',
    desc: 'Structured lead detection from conversations. Track, score and assign — full pipeline included.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Conversation volume, agent performance, lead conversion. Live dashboard per workspace.',
  },
  {
    icon: Shield,
    title: 'RLS Security',
    desc: 'Row-level security on every table. Workspace isolation enforced at the database layer.',
  },
  {
    icon: Cpu,
    title: 'Claude Sonnet 4.6',
    desc: 'Configurable system prompts, structured output, conversation memory and model evaluation.',
  },
]

const badges = [
  'Multi-tenant',
  'Claude API',
  'RAG',
  'WhatsApp Mock',
  'Human Handoff',
  'Lead Capture',
  'Analytics',
  'Billing Ready',
]

export const metadata = {
  title: 'WAAI SaaS — AI WhatsApp Agent Platform',
  description:
    'Build, configure and deploy intelligent WhatsApp agents with RAG, lead capture and human handoff. Powered by Claude AI.',
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#060606] text-white font-[var(--font-geist-sans)]">

      {/* Status bar */}
      <div className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-xs text-white/40 tracking-wide">
              v0.9.0 staging ready — Supabase connected · RLS enabled · RAG enabled
            </span>
          </div>
          <span className="text-xs text-white/25 hidden sm:block">WAAI SaaS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/90 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <span className="text-sm font-bold text-white">W</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-white/90">WAAI SaaS</span>
        </div>
        <a
          href="/login"
          className="text-xs font-medium text-white/50 hover:text-white/90 transition-colors duration-150"
        >
          Sign in →
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-white/50 tracking-wide">Platform v0.9.0 · Staging</span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
          <span className="text-white">AI agents for</span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            WhatsApp businesses
          </span>
        </h1>

        <p className="text-lg text-white/45 max-w-xl mx-auto leading-relaxed mb-10">
          Build, configure and deploy intelligent WhatsApp agents with RAG knowledge,
          lead capture and human handoff — for SMEs that need real automation.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/55 font-medium"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] px-6 py-2.5 text-sm font-semibold text-white transition-[transform,background-color] duration-150 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
          >
            Get started free
          </a>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.97] px-6 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-[transform,background-color,color] duration-150"
          >
            Sign in
          </a>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 hover:bg-white/[0.05] hover:border-white/[0.12] transition-[background-color,border-color] duration-200 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4 group-hover:bg-emerald-500/15 transition-colors duration-200">
                <Icon className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold text-white/90 tracking-tight mb-1.5">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/80">
              <span className="text-xs font-bold text-white">W</span>
            </div>
            <span className="text-xs text-white/30">WAAI SaaS</span>
          </div>
          <span className="text-xs text-white/20">
            Built by{' '}
            <a
              href="https://vidal-pro-portfolio.vercel.app"
              className="text-white/35 hover:text-white/60 transition-colors duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vidal Reñao
            </a>
            {' '}· Powered by Claude API · Swiss quality
          </span>
        </div>
      </footer>
    </div>
  )
}
