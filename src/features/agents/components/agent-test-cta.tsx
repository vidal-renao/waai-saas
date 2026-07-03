import Link from "next/link";

interface AgentTestCtaProps {
  agentId: string;
  hasActivePrompt: boolean;
}

export function AgentTestCta({ agentId, hasActivePrompt }: AgentTestCtaProps) {
  if (!hasActivePrompt) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-5">
        <p className="text-sm font-medium text-zinc-400">AI Testing Not Available</p>
        <p className="mt-1 text-xs text-zinc-500">
          This AI Employee doesn&apos;t have AI Instructions yet.{" "}
          <Link
            href={`/dashboard/agents/${agentId}/prompt`}
            className="text-green-400 hover:text-green-300"
          >
            Generate AI Instructions
          </Link>{" "}
          before testing.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Test Your AI Employee</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Chat with your AI Employee in a safe test environment before going live on WhatsApp.
          </p>
        </div>
        <Link
          href={`/dashboard/agents/${agentId}/sandbox`}
          className="flex-shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500"
        >
          Open AI Testing →
        </Link>
      </div>
    </div>
  );
}
