import { createClient } from "@/lib/supabase/server";
import { archiveKnowledgeDocumentUseCase } from "@/server/use-cases/archive-knowledge-document";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await archiveKnowledgeDocumentUseCase(supabase, user.id, documentId);

  if ("code" in result && !("success" in result)) {
    const status = result.code === "FORBIDDEN" ? 403 : 404;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
