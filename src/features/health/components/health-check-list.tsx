interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "down" | "missing";
  description: string;
}

interface HealthCheckListProps {
  checks: HealthCheck[];
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ok:       { bg: "bg-green-900/40", text: "text-green-400",  label: "OK" },
  degraded: { bg: "bg-yellow-900/40", text: "text-yellow-400", label: "Degraded" },
  down:     { bg: "bg-red-900/40",    text: "text-red-400",    label: "Down" },
  missing:  { bg: "bg-zinc-800",      text: "text-zinc-500",   label: "Not configured" },
};

export function HealthCheckList({ checks }: HealthCheckListProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="divide-y divide-zinc-800">
        {checks.map((check) => {
          const badge = STATUS_BADGE[check.status] ?? STATUS_BADGE.missing;
          return (
            <div key={check.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{check.name}</p>
                <p className="text-xs text-zinc-500">{check.description}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
