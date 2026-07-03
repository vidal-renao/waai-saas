import Link from "next/link";
import type { OperationalAlert } from "@/server/repositories/analytics-repository";

interface OperationalAlertsPanelProps {
  alerts: OperationalAlert[];
  maxVisible?: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-800 bg-red-950/20",
  warning: "border-yellow-800 bg-yellow-950/20",
  info: "border-zinc-800 bg-zinc-900",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-zinc-500",
};

export function OperationalAlertsPanel({ alerts, maxVisible = 10 }: OperationalAlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Operational Alerts</h3>
        <p className="text-xs text-zinc-500">No active alerts. Everything is running smoothly.</p>
      </div>
    );
  }

  const visible = alerts.slice(0, maxVisible);
  const hidden = alerts.length - maxVisible;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Operational Alerts</h3>
        <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {visible.map((alert, i) => {
          const href = alert.action_href ?? "/dashboard";
          return (
            <Link
              key={`${alert.type}-${i}`}
              href={href}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:opacity-80 ${SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info}`}
            >
              <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${SEVERITY_DOT[alert.severity] ?? "bg-zinc-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{alert.title}</p>
                <p className="text-xs text-zinc-400 truncate">{alert.description}</p>
              </div>
            </Link>
          );
        })}
        {hidden > 0 && (
          <p className="text-center text-xs text-zinc-500 pt-1">
            +{hidden} more alert{hidden !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
