import type { WaaiHandoffStatus } from "@/types/database";

const STATUS_CONFIG: Record<WaaiHandoffStatus, { label: string; className: string }> = {
  requested: { label: "Requested", className: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50" },
  active:    { label: "Active",    className: "text-orange-400 bg-orange-950/30 border-orange-900/50" },
  resolved:  { label: "Resolved",  className: "text-green-400 bg-green-950/30 border-green-900/50" },
  canceled:  { label: "Cancelled", className: "text-zinc-500 bg-zinc-900 border-zinc-800" },
};

export function HandoffStatusBadge({ status }: { status: WaaiHandoffStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.requested;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
