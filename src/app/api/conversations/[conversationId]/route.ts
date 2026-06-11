import { createClient } from "@/lib/supabase/server";
import { getSandboxConversationUseCase } from "@/server/use-cases/get-sandbox-conversation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getSandboxConversationUseCase(
    supabase,
    user.id,
    conversationId
  );
  if (!result) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(result);
}
