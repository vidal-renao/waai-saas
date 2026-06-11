import { createClient } from "@/lib/supabase/server";
import { startSandboxConversationUseCase } from "@/server/use-cases/start-sandbox-conversation";
import { startSandboxSchema } from "@/lib/validators/sandbox";

export async function POST(
  request: Request,
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is valid
  }

  const parsed = startSandboxSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await startSandboxConversationUseCase(
    supabase,
    user.id,
    agentId,
    parsed.data.title
  );

  if ("error" in result) {
    const status = result.code === "FORBIDDEN" ? 403 : 404;
    return Response.json(result, { status });
  }

  return Response.json(result, { status: 201 });
}
