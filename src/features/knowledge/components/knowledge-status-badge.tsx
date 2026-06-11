import type { WaaiKnowledgeDocumentStatus } from "@/types/database";

const STATUS_LABELS: Record<WaaiKnowledgeDocumentStatus, string> = {
  draft: "Borrador",
  processing: "Procesando",
  ready: "Listo",
  failed: "Error",
  archived: "Archivado",
};

const STATUS_COLORS: Record<WaaiKnowledgeDocumentStatus, string> = {
  draft: "text-zinc-400 bg-zinc-800 border-zinc-700",
  processing: "text-yellow-400 bg-yellow-950/30 border-yellow-900/50",
  ready: "text-green-400 bg-green-950/30 border-green-900/50",
  failed: "text-red-400 bg-red-950/30 border-red-900/50",
  archived: "text-zinc-600 bg-zinc-900 border-zinc-800",
};

interface KnowledgeStatusBadgeProps {
  status: WaaiKnowledgeDocumentStatus;
}

export function KnowledgeStatusBadge({ status }: KnowledgeStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
