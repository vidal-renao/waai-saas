import { createClient } from "@/lib/supabase/server";
import { listAgentConversationsUseCase } from "@/server/use-cases/list-agent-conversations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await listAgentConversationsUseCase(supabase, user.id, agentId);
  if (!result) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(result);
}
