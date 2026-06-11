import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAgentSystemPromptUseCase } from "@/server/use-cases/generate-agent-system-prompt";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await params;
  const result = await generateAgentSystemPromptUseCase(supabase, user.id, agentId);

  if (result.error) {
    const status =
      result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ promptVersion: result.promptVersion });
}
