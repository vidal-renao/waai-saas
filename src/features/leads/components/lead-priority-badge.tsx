import type { WaaiLeadPriority } from "@/types/database";

const PRIORITY_CONFIG: Record<WaaiLeadPriority, { label: string; className: string }> = {
  low:    { label: "Baja",     className: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  medium: { label: "Media",    className: "text-blue-400 bg-blue-950/20 border-blue-900/40" },
  high:   { label: "Alta",     className: "text-orange-400 bg-orange-950/20 border-orange-900/40" },
  urgent: { label: "Urgente",  className: "text-red-400 bg-red-950/30 border-red-900/50" },
};

export function LeadPriorityBadge({ priority }: { priority: WaaiLeadPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
