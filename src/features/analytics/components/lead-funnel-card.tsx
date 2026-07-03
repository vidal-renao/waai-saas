import type { LeadFunnelData } from "@/server/repositories/analytics-repository";
import { safeRate } from "@/server/services/analytics-service";

interface LeadFunnelCardProps {
  funnel: LeadFunnelData;
}

const STAGES = [
  { key: "new_count", label: "New", color: "bg-zinc-500" },
  { key: "qualified_count", label: "Qualified", color: "bg-blue-500" },
  { key: "contacted_count", label: "Contacted", color: "bg-yellow-500" },
  { key: "won_count", label: "Won", color: "bg-green-500" },
  { key: "lost_count", label: "Lost", color: "bg-red-500" },
] as const;

export function LeadFunnelCard({ funnel }: LeadFunnelCardProps) {
  const conversionRate = safeRate(funnel.won_count, funnel.active_total);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Lead Funnel</h3>
        <span className="text-xs text-zinc-500">
          Conversion: <span className="text-green-400 font-semibold">{conversionRate}%</span>
        </span>
      </div>
      <div className="space-y-2">
        {STAGES.map(({ key, label, color }) => {
          const count = funnel[key];
          const pct = funnel.active_total > 0
            ? Math.round((count / (funnel.active_total + funnel.archived_count)) * 100)
            : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-400">{label}</span>
                <span className="text-zinc-300 font-medium">{count}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-800 pt-4">
        <div className="text-center">
          <p className="text-xs text-zinc-500">Total active</p>
          <p className="text-lg font-bold text-white">{funnel.active_total}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500">WhatsApp</p>
          <p className="text-lg font-bold text-white">{funnel.from_whatsapp}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500">Manual</p>
          <p className="text-lg font-bold text-white">{funnel.from_manual}</p>
        </div>
      </div>
    </div>
  );
}
