import Link from "next/link";
import type { WaaiLead } from "@/types/database";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadPriorityBadge } from "./lead-priority-badge";

export function LeadCard({ lead }: { lead: WaaiLead }) {
  return (
    <Link
      href={`/dashboard/leads/${lead.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="truncate text-sm font-medium text-white">
          {lead.customer_name ?? lead.summary ?? "Lead sin nombre"}
        </span>
        {lead.requested_service && (
          <span className="text-xs text-zinc-400 truncate">{lead.requested_service}</span>
        )}
        <span className="text-xs text-zinc-500">
          {new Date(lead.created_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          {lead.customer_phone && ` · ${lead.customer_phone}`}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LeadPriorityBadge priority={lead.priority} />
        <LeadStatusBadge status={lead.status} />
      </div>
    </Link>
  );
}
