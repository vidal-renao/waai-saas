import { safeRate } from "@/server/services/analytics-service";

interface RagUsageCardProps {
  ragRuns: number;
  totalRuns: number;
  docsReady: number;
  docsProcessing: number;
  docsFailed: number;
}

export function RagUsageCard({ ragRuns, totalRuns, docsReady, docsProcessing, docsFailed }: RagUsageCardProps) {
  const ragRate = safeRate(ragRuns, totalRuns);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-300">Uso RAG & Knowledge Base</h3>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-400">Respuestas con RAG</span>
          <span className="font-semibold text-blue-400">{ragRate}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800">
          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${ragRate}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          {ragRuns} de {totalRuns} ejecuciones
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-zinc-800 px-3 py-2 text-center">
          <p className="text-xs text-zinc-500">Listos</p>
          <p className="text-lg font-bold text-green-400">{docsReady}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2 text-center">
          <p className="text-xs text-zinc-500">Proceso</p>
          <p className="text-lg font-bold text-yellow-400">{docsProcessing}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 px-3 py-2 text-center">
          <p className="text-xs text-zinc-500">Fallidos</p>
          <p className={`text-lg font-bold ${docsFailed > 0 ? "text-red-400" : "text-zinc-400"}`}>
            {docsFailed}
          </p>
        </div>
      </div>
    </div>
  );
}
