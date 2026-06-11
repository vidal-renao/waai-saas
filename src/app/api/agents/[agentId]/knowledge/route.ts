import { createClient } from "@/lib/supabase/server";
import { getAgentKnowledgeSourcesUseCase } from "@/server/use-cases/get-agent-knowledge-sources";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getAgentKnowledgeSourcesUseCase(supabase, user.id, agentId);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json(result);
}
