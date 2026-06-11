import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assignConversationUseCase } from "@/server/use-cases/assign-conversation";
import { assignConversationSchema } from "@/lib/validators/handoff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  try {
    const assignment = await assignConversationUseCase(
      supabase,
      user.id,
      conversationId,
      parsed.data.assignedTo,
      parsed.data.reason ?? null
    );
    if (!assignment) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg.startsWith("FORBIDDEN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.includes("NOT_FOUND")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg.includes("BAD_REQUEST")) return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
