import Link from "next/link";

interface AgentKnowledgeCtaProps {
  agentId: string;
  linkedCount: number;
}

export function AgentKnowledgeCta({ agentId, linkedCount }: AgentKnowledgeCtaProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Company Knowledge</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {linkedCount > 0
              ? `${linkedCount} document${linkedCount !== 1 ? "s" : ""} linked. Your AI Employee will use this knowledge when answering customers.`
              : "No documents linked yet. Add your business knowledge to improve your AI Employee's answers."}
          </p>
        </div>
        <Link
          href={`/dashboard/agents/${agentId}/knowledge`}
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
        >
          Manage Knowledge →
        </Link>
      </div>
    </div>
  );
}
