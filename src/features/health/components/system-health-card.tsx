interface HealthCheckItem {
  label: string;
  status: "ok" | "degraded" | "down" | "unknown";
  detail?: string;
}

interface SystemHealthCardProps {
  overallStatus: "ok" | "degraded" | "down";
  checks: HealthCheckItem[];
  lastChecked?: string;
}

const STATUS_DOT: Record<string, string> = {
  ok:       "bg-green-500",
  degraded: "bg-yellow-500",
  down:     "bg-red-500",
  unknown:  "bg-zinc-500",
};

const STATUS_LABEL: Record<string, string> = {
  ok:       "Operational",
  degraded: "Degraded",
  down:     "Down",
  unknown:  "Unknown",
};

const OVERALL_BORDER: Record<string, string> = {
  ok:       "border-green-900/40",
  degraded: "border-yellow-900/40",
  down:     "border-red-900/40",
};

export function SystemHealthCard({
  overallStatus,
  checks,
  lastChecked,
}: SystemHealthCardProps) {
  return (
    <div className={`rounded-xl border bg-zinc-900 p-5 ${OVERALL_BORDER[overallStatus] ?? "border-zinc-800"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">System Status</h3>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[overallStatus]}`} />
          <span className={`text-xs font-medium ${overallStatus === "ok" ? "text-green-400" : overallStatus === "degraded" ? "text-yellow-400" : "text-red-400"}`}>
            {STATUS_LABEL[overallStatus]}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">{check.label}</span>
            <div className="flex items-center gap-2">
              {check.detail && (
                <span className="text-xs text-zinc-600">{check.detail}</span>
              )}
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[check.status]}`} />
            </div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="mt-4 text-xs text-zinc-600">
          Last checked: {new Date(lastChecked).toLocaleTimeString("de-CH")}
        </p>
      )}
    </div>
  );
}
