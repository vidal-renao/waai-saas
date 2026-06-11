import { safeRate } from "@/server/services/analytics-service";

interface AiUsageCardProps {
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostCents: number;
  avgLatencyMs: number | null;
}

function formatCost(cents: number): string {
  if (cents === 0) return "$0.00";
  return `~$${(cents / 100).toFixed(2)}`;
}

export function AiUsageCard({
  totalRuns,
  successRuns,
  errorRuns,
  totalTokens,
  totalInputTokens,
  totalOutputTokens,
  estimatedCostCents,
  avgLatencyMs,
}: AiUsageCardProps) {
  const successRate = safeRate(successRuns, totalRuns);
  const errorRate = safeRate(errorRuns, totalRuns);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">Uso de IA (Claude)</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-zinc-500">Ejecuciones</p>
          <p className="text-xl font-bold text-white">{totalRuns}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Éxito / Error</p>
          <p className="text-xl font-bold">
            <span className="text-green-400">{successRate}%</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className={errorRuns > 0 ? "text-red-400" : "text-zinc-400"}>{errorRate}%</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Total tokens</p>
          <p className="text-xl font-bold text-white">{totalTokens.toLocaleString("es-ES")}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Coste estimado</p>
          <p className="text-xl font-bold text-zinc-300">{formatCost(estimatedCostCents)}</p>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-zinc-500">Input</p>
          <p className="text-sm text-zinc-300">{totalInputTokens.toLocaleString("es-ES")}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Output</p>
          <p className="text-sm text-zinc-300">{totalOutputTokens.toLocaleString("es-ES")}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Latencia</p>
          <p className="text-sm text-zinc-300">{avgLatencyMs !== null ? `${avgLatencyMs} ms` : "—"}</p>
        </div>
      </div>
    </div>
  );
}
