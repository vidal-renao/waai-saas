export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeDocumentService } from "@/server/services/knowledge-document-service";
import { KnowledgeChunkRepository } from "@/server/repositories/knowledge-chunk-repository";
import { KnowledgeStatusBadge } from "@/features/knowledge/components/knowledge-status-badge";
import { KnowledgeProcessingPanel } from "@/features/knowledge/components/knowledge-processing-panel";

export default async function KnowledgeDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) redirect("/onboarding");

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  if (!membership) redirect("/onboarding");

  const service = new KnowledgeDocumentService(supabase);
  const doc = await service.getDocument(documentId, workspaceId);
  if (!doc) notFound();

  const chunkRepo = new KnowledgeChunkRepository(supabase);
  const chunkCount = await chunkRepo.countByDocument(documentId);

  const canProcess = ["owner", "admin", "agent_manager"].includes(membership.role);
  const canArchive = ["owner", "admin"].includes(membership.role);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/knowledge"
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Knowledge Base
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
            <KnowledgeStatusBadge status={doc.status} />
          </div>
          {doc.description && (
            <p className="mt-1 text-sm text-zinc-400">{doc.description}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            Tipo: {doc.source_type.toUpperCase()} · Creado:{" "}
            {new Date(doc.created_at).toLocaleDateString("es-ES")}
            {chunkCount > 0 && ` · ${chunkCount} chunks`}
          </p>
        </div>
      </div>

      {/* Processing */}
      {canProcess && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Procesamiento</p>
          <KnowledgeProcessingPanel
            documentId={doc.id}
            status={doc.status}
            errorMessage={doc.error_message}
            chunkCount={chunkCount}
          />
        </div>
      )}

      {/* Content preview */}
      {doc.text_content && (
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
            Contenido ({doc.text_content.length.toLocaleString()} chars)
          </p>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-zinc-300 leading-relaxed">
            {doc.text_content.slice(0, 3000)}
            {doc.text_content.length > 3000 && "\n…(truncado para vista previa)"}
          </pre>
        </div>
      )}

      {/* Danger zone */}
      {canArchive && doc.status !== "archived" && (
        <div className="rounded-xl border border-red-900/40 bg-zinc-900 p-5">
          <p className="text-sm font-medium text-red-400">Zona de peligro</p>
          <p className="mt-1 text-xs text-zinc-500">
            Archivar elimina el documento del conteo activo y lo desvincula de los agentes.
          </p>
          <form action={`/api/knowledge/documents/${doc.id}/archive`} method="POST" className="mt-3">
            <button
              type="submit"
              className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/40"
            >
              Archivar documento
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
