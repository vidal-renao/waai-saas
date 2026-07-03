import type { HandoffMetricsData } from "@/server/repositories/analytics-repository";

interface HandoffMetricsCardProps {
  metrics: HandoffMetricsData;
  totalConversations?: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  customer_request: "Customer Request",
  low_confidence: "Low Confidence",
  angry_customer: "Angry Customer",
  urgent_request: "Urgent",
  sensitive_topic: "Sensitive Topic",
  system_rule: "System Rule",
};

export function HandoffMetricsCard({ metrics, totalConversations }: HandoffMetricsCardProps) {
  const total = metrics.active_count + metrics.resolved_count + metrics.canceled_count;
  const handoffRate =
    totalConversations && totalConversations > 0
      ? Math.round((total / totalConversations) * 100)
      : null;

  const triggers = [
    { key: "trigger_manual", label: "Manual", count: metrics.trigger_manual },
    { key: "trigger_customer_request", label: TRIGGER_LABELS.customer_request, count: metrics.trigger_customer_request },
    { key: "trigger_low_confidence", label: TRIGGER_LABELS.low_confidence, count: metrics.trigger_low_confidence },
    { key: "trigger_angry_customer", label: TRIGGER_LABELS.angry_customer, count: metrics.trigger_angry_customer },
    { key: "trigger_urgent_request", label: TRIGGER_LABELS.urgent_request, count: metrics.trigger_urgent_request },
  ].filter((t) => t.count > 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Human Transfers</h3>
        {handoffRate !== null && (
          <span className="text-xs text-zinc-500">
            Rate: <span className="font-semibold text-yellow-400">{handoffRate}%</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center rounded-lg bg-zinc-800 py-2">
          <p className="text-xs text-zinc-500">Active</p>
          <p className={`text-xl font-bold ${metrics.active_count > 0 ? "text-yellow-400" : "text-white"}`}>
            {metrics.active_count}
          </p>
        </div>
        <div className="text-center rounded-lg bg-zinc-800 py-2">
          <p className="text-xs text-zinc-500">Resolved</p>
          <p className="text-xl font-bold text-green-400">{metrics.resolved_count}</p>
        </div>
        <div className="text-center rounded-lg bg-zinc-800 py-2">
          <p className="text-xs text-zinc-500">Cancelled</p>
          <p className="text-xl font-bold text-zinc-300">{metrics.canceled_count}</p>
        </div>
      </div>
      {metrics.avg_resolution_minutes !== null && (
        <p className="mb-3 text-xs text-zinc-500">
          Avg. resolution time:{" "}
          <span className="text-zinc-300 font-medium">{metrics.avg_resolution_minutes} min</span>
        </p>
      )}
      {triggers.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-zinc-500 uppercase tracking-wider">By trigger</p>
          <div className="space-y-1">
            {triggers.map(({ key, label, count }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{label}</span>
                <span className="text-zinc-300 font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
