import Link from "next/link";
import { KnowledgeDocumentCard } from "./knowledge-document-card";
import type { WaaiKnowledgeDocument } from "@/types/database";

interface KnowledgeDocumentListProps {
  documents: WaaiKnowledgeDocument[];
}

export function KnowledgeDocumentList({ documents }: KnowledgeDocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-400">No hay documentos de conocimiento todavía.</p>
        <Link
          href="/dashboard/knowledge/new"
          className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
        >
          Crear primer documento
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <KnowledgeDocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
