export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listKnowledgeDocumentsUseCase } from "@/server/use-cases/list-knowledge-documents";
import { KnowledgeDocumentList } from "@/features/knowledge/components/knowledge-document-list";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await listKnowledgeDocumentsUseCase(supabase, user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Documentos de conocimiento del negocio vinculados a tus agentes.
          </p>
        </div>
        <Link
          href="/dashboard/knowledge/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
        >
          + Nuevo documento
        </Link>
      </div>

      {result.workspaceId && (
        <p className="mb-4 text-xs text-zinc-600">
          {result.documentCount ?? 0} documento{result.documentCount !== 1 ? "s" : ""} activos
        </p>
      )}

      <KnowledgeDocumentList documents={result.documents} />
    </div>
  );
}
