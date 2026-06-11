import Link from "next/link";
import type { WaaiAgent } from "@/types/database";
import type { AgentLimitCheck } from "@/server/services/agent-service";
import { AgentCard } from "./agent-card";
import { AgentLimitWarning } from "./agent-limit-warning";

interface AgentListProps {
  agents: WaaiAgent[];
  limitCheck: AgentLimitCheck;
}

export function AgentList({ agents, limitCheck }: AgentListProps) {
  const canCreate = limitCheck.allowed;
  const activeAgents = agents.filter((a) => a.status !== "archived");
  const archivedAgents = agents.filter((a) => a.status === "archived");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes de WhatsApp</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Crea y gestiona los agentes inteligentes de tu empresa.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/agents/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors whitespace-nowrap"
          >
            + Nuevo agente
          </Link>
        ) : (
          <button
            disabled
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-500 cursor-not-allowed whitespace-nowrap"
          >
            + Nuevo agente
          </button>
        )}
      </div>

      {/* Limit warning */}
      {(!canCreate || limitCheck.limit !== -1) && (
        <AgentLimitWarning
          current={limitCheck.current}
          limit={limitCheck.limit}
          variant={canCreate ? "warning" : "error"}
        />
      )}

      {/* Active agents */}
      {activeAgents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-10 text-center">
          <p className="text-zinc-400">Aún no tienes agentes activos.</p>
          {canCreate && (
            <Link
              href="/dashboard/agents/new"
              className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              Crear tu primer agente
            </Link>
          )}
        </div>
      )}

      {/* Archived agents (collapsible section) */}
      {archivedAgents.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-600">
            Archivados ({archivedAgents.length})
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-50">
            {archivedAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
