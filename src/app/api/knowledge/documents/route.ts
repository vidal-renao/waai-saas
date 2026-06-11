import { createClient } from "@/lib/supabase/server";
import { createKnowledgeDocumentSchema } from "@/lib/validators/knowledge";
import { createKnowledgeDocumentUseCase } from "@/server/use-cases/create-knowledge-document";
import { listKnowledgeDocumentsUseCase } from "@/server/use-cases/list-knowledge-documents";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listKnowledgeDocumentsUseCase(supabase, user.id);
  return Response.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createKnowledgeDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createKnowledgeDocumentUseCase(supabase, user.id, parsed.data);

  if ("code" in result) {
    const status = result.code === "DOCUMENT_LIMIT" ? 402 : 403;
    return Response.json(result, { status });
  }

  return Response.json(result, { status: 201 });
}
