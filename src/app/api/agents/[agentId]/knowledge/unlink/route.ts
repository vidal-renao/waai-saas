import { createClient } from "@/lib/supabase/server";
import { unlinkDocumentSchema } from "@/lib/validators/knowledge";
import { unlinkDocumentFromAgentUseCase } from "@/server/use-cases/unlink-document-from-agent";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = unlinkDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await unlinkDocumentFromAgentUseCase(supabase, user.id, agentId, parsed.data.documentId);

  if (result && "code" in result && !("success" in result)) {
    const status = (result as { code: string }).code === "FORBIDDEN" ? 403 : 404;
    return Response.json(result, { status });
  }

  return Response.json({ success: true });
}
