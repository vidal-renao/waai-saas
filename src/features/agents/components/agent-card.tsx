import Link from "next/link";
import type { WaaiAgent } from "@/types/database";
import { AgentStatusBadge } from "./agent-status-badge";

interface AgentCardProps {
  agent: WaaiAgent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {agent.name}
          </h3>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {agent.channel} · {agent.primary_language}
          </p>
        </div>
        <AgentStatusBadge status={agent.status as "draft" | "active" | "paused" | "archived"} />
      </div>

      {agent.description && (
        <p className="text-sm text-zinc-400 line-clamp-2">{agent.description}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Link
          href={`/dashboard/agents/${agent.id}`}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          View
        </Link>
        <Link
          href={`/dashboard/agents/${agent.id}/edit`}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
