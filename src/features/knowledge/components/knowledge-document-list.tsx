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
        <p className="text-zinc-400">No knowledge documents yet.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Add your first document so your AI Employees can answer with accurate information.
        </p>
        <Link
          href="/dashboard/knowledge/new"
          className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
        >
          Add First Document
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
