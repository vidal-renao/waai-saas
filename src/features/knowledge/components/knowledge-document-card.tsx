import Link from "next/link";
import { KnowledgeStatusBadge } from "./knowledge-status-badge";
import type { WaaiKnowledgeDocument } from "@/types/database";

interface KnowledgeDocumentCardProps {
  document: WaaiKnowledgeDocument;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  txt: "TXT",
  markdown: "Markdown",
  faq: "FAQ",
  pdf: "PDF",
};

export function KnowledgeDocumentCard({ document: doc }: KnowledgeDocumentCardProps) {
  return (
    <Link
      href={`/dashboard/knowledge/${doc.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-white">{doc.title}</span>
        <span className="text-xs text-zinc-500">
          {SOURCE_TYPE_LABELS[doc.source_type] ?? doc.source_type} ·{" "}
          {new Date(doc.created_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          {doc.text_content ? ` · ${doc.text_content.length.toLocaleString()} chars` : ""}
        </span>
        {doc.description && (
          <span className="truncate text-xs text-zinc-500">{doc.description}</span>
        )}
      </div>
      <KnowledgeStatusBadge status={doc.status} />
    </Link>
  );
}
