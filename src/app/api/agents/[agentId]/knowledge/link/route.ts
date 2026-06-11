import { createClient } from "@/lib/supabase/server";
import { linkDocumentSchema } from "@/lib/validators/knowledge";
import { linkDocumentToAgentUseCase } from "@/server/use-cases/link-document-to-agent";

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

  const parsed = linkDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await linkDocumentToAgentUseCase(supabase, user.id, agentId, parsed.data.documentId);

  if ("code" in result && !("id" in result)) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, NOT_FOUND: 404, NOT_READY: 409 };
    const status = statusMap[(result as { code: string }).code] ?? 500;
    return Response.json(result, { status });
  }

  return Response.json(result, { status: 201 });
}
