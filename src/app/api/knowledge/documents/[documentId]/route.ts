import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { KnowledgeDocumentService } from "@/server/services/knowledge-document-service";
import { KnowledgeChunkRepository } from "@/server/repositories/knowledge-chunk-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) return Response.json({ error: "Not found" }, { status: 404 });

  const service = new KnowledgeDocumentService(supabase);
  const doc = await service.getDocument(documentId, workspaceId);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const chunkRepo = new KnowledgeChunkRepository(supabase);
  const chunkCount = await chunkRepo.countByDocument(documentId);

  return Response.json({ ...doc, chunk_count: chunkCount });
}
