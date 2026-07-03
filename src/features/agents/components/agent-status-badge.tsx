import type { WaaiAgentStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  WaaiAgentStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  active: {
    label: "Active",
    className: "bg-green-900/30 text-green-400 border-green-800",
  },
  paused: {
    label: "Paused",
    className: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
  },
  archived: {
    label: "Archived",
    className: "bg-zinc-900 text-zinc-600 border-zinc-800",
  },
};

interface AgentStatusBadgeProps {
  status: WaaiAgentStatus;
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
