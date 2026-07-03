import type { WaaiLeadStatus } from "@/types/database";

const STATUS_CONFIG: Record<WaaiLeadStatus, { label: string; className: string }> = {
  new:       { label: "New",       className: "text-blue-400 bg-blue-950/30 border-blue-900/50" },
  qualified: { label: "Qualified", className: "text-purple-400 bg-purple-950/30 border-purple-900/50" },
  contacted: { label: "Contacted", className: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50" },
  won:       { label: "Won",       className: "text-green-400 bg-green-950/30 border-green-900/50" },
  lost:      { label: "Lost",      className: "text-red-400 bg-red-950/30 border-red-900/50" },
  archived:  { label: "Archived",  className: "text-zinc-500 bg-zinc-900 border-zinc-800" },
};

export function LeadStatusBadge({ status }: { status: WaaiLeadStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
