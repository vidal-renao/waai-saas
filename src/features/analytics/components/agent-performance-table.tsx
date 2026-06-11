import type { AgentPerformanceRow } from "@/server/repositories/analytics-repository";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  paused: "Pausado",
  draft: "Borrador",
  archived: "Archivado",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  paused: "text-yellow-400",
  draft: "text-zinc-400",
  archived: "text-zinc-600",
};

function safeRate(a: number, b: number) {
  if (b === 0) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

interface AgentPerformanceTableProps {
  agents: AgentPerformanceRow[];
}

export function AgentPerformanceTable({ agents }: AgentPerformanceTableProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">Sin agentes en este período.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900">
          <tr className="border-b border-zinc-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Agente</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Convers.</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Mensajes</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Leads</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Handoffs</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">RAG %</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Errores</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Latencia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-950">
          {agents.map((a) => (
            <tr key={a.agent_id} className="hover:bg-zinc-900/50">
              <td className="px-4 py-3">
                <p className="font-medium text-white">{a.agent_name}</p>
                <p className={`text-xs ${STATUS_COLORS[a.agent_status] ?? "text-zinc-500"}`}>
                  {STATUS_LABELS[a.agent_status] ?? a.agent_status} · {a.primary_language}
                </p>
              </td>
              <td className="px-4 py-3 text-right text-zinc-300">{a.conversations_count}</td>
              <td className="px-4 py-3 text-right text-zinc-300">{a.messages_count}</td>
              <td className="px-4 py-3 text-right text-zinc-300">{a.leads_count}</td>
              <td className="px-4 py-3 text-right text-zinc-300">{a.handoffs_count}</td>
              <td className="px-4 py-3 text-right text-zinc-300">{safeRate(a.rag_runs, a.total_runs)}</td>
              <td className={`px-4 py-3 text-right ${a.error_count > 0 ? "text-red-400" : "text-zinc-300"}`}>
                {a.error_count}
              </td>
              <td className="px-4 py-3 text-right text-zinc-300">
                {a.avg_latency_ms !== null ? `${a.avg_latency_ms} ms` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
