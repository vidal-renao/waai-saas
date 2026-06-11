interface UsageLimitCardProps {
  label: string;
  used: number;
  limit: number;
  pct: number | null;
  severity?: "ok" | "warning" | "critical";
}

function limitLabel(limit: number) {
  return limit === -1 ? "Ilimitado" : limit.toLocaleString("es-ES");
}

export function UsageLimitCard({ label, used, limit, pct, severity = "ok" }: UsageLimitCardProps) {
  const barColor =
    severity === "critical"
      ? "bg-red-500"
      : severity === "warning"
        ? "bg-yellow-500"
        : "bg-green-500";

  const borderColor =
    severity === "critical"
      ? "border-red-900"
      : severity === "warning"
        ? "border-yellow-900"
        : "border-zinc-800";

  return (
    <div className={`rounded-xl border ${borderColor} bg-zinc-900 p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        {severity !== "ok" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              severity === "critical"
                ? "bg-red-900/40 text-red-400"
                : "bg-yellow-900/40 text-yellow-400"
            }`}
          >
            {severity === "critical" ? "Crítico" : "Atención"}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-bold text-white">
        {used.toLocaleString("es-ES")}
        <span className="ml-1 text-sm font-normal text-zinc-400">
          / {limitLabel(limit)}
        </span>
      </p>
      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-zinc-700">
            <div
              className={`h-1.5 rounded-full ${barColor} transition-all`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{pct}% usado</p>
        </div>
      )}
    </div>
  );
}
