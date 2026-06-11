import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAgentConfigUseCase } from "@/server/use-cases/update-agent-config";

export async function PUT(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await updateAgentConfigUseCase(supabase, user.id, agentId, body);

  if (result.error) {
    const status =
      result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
