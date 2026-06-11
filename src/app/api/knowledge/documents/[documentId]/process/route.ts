import { createClient } from "@/lib/supabase/server";
import { processKnowledgeDocumentUseCase } from "@/server/use-cases/process-knowledge-document";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processKnowledgeDocumentUseCase(supabase, user.id, documentId);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      ARCHIVED: 409,
      NO_API_KEY: 503,
      EXTRACTION_ERROR: 422,
      EMBEDDING_ERROR: 502,
      EMPTY_CONTENT: 422,
    };
    const status = statusMap[result.code] ?? 500;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
