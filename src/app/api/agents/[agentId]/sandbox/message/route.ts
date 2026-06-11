import { createClient } from "@/lib/supabase/server";
import { sendSandboxMessageUseCase } from "@/server/use-cases/send-sandbox-message";
import { sendMessageSchema } from "@/lib/validators/sandbox";

export const maxDuration = 60;

const ERROR_STATUS: Record<string, number> = {
  FORBIDDEN: 403,
  MESSAGE_LIMIT: 402,
  NO_API_KEY: 503,
  NO_PROMPT: 404,
  AGENT_NOT_FOUND: 404,
  CONVERSATION_NOT_FOUND: 404,
  CLAUDE_ERROR: 500,
};

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await sendSandboxMessageUseCase(
    supabase,
    user.id,
    agentId,
    parsed.data
  );

  if ("error" in result) {
    const status = ERROR_STATUS[result.code] ?? 500;
    return Response.json(result, { status });
  }

  return Response.json(result);
}
